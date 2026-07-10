import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { HeartsState } from '../games/hearts/engine'
import { Card, Seat } from '../core/types'
import { isQueenOfSpades } from '../core/cards'
import { PlayerSeat } from './PlayerSeat'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { PassTray } from './PassTray'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { Toast } from './Toast'
import { LastTrickModal } from './LastTrickModal'
import { Scoreboard } from './Scoreboard'
import { Overlay } from './Overlay'
import {
  fxDeal,
  fxHandEnd,
  fxHeartsBroken,
  fxIllegal,
  fxPassCard,
  fxPassConfirm,
  fxPlayCard,
  fxQueenTaken,
  fxTrickWin,
  fxYourTurn,
} from '../fx'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { passSource } from '../games/hearts/rules'
import {
  humorAiThinking,
  humorHeartsBroken,
  humorIllegal,
  humorMatchEnd,
  humorMoon,
  humorPass,
  humorQueen,
  humorTrickWin,
  humorYourTurn,
} from '../humor'
import './Table.css'

interface Props {
  state: HeartsState
  legal: Card[]
  autoFinishHand?: boolean
  feltStyle?: string
  hapticsEnabled?: boolean
  humorMode?: boolean
  /** Used for deal intro + animation timing */
  gameSpeed?: GameSpeed
  onCardClick: (card: Card) => void
  onConfirmPass: () => void
  onAcceptReceived: () => void
  onNextHand: () => void
  onNewGame: () => void
  onHome: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
}

type FlightKind = 'pass' | 'play-in' | 'play-ai'

interface FlightState {
  kind: FlightKind
  card: Card
  from: FlightRect
  to: FlightRect
  size: 'hand' | 'trick' | 'slot'
  durationMs: number
}

type DramaKind = 'hearts' | 'queen' | null

export function Table({
  state,
  legal,
  autoFinishHand = true,
  feltStyle = 'green',
  hapticsEnabled = true,
  humorMode = false,
  gameSpeed = 'fast',
  onCardClick,
  onConfirmPass,
  onAcceptReceived,
  onNextHand,
  onNewGame,
  onHome,
  onSettings,
  onStartOver,
  onAbandon,
}: Props) {
  const [showLast, setShowLast] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [flight, setFlight] = useState<FlightState | null>(null)
  /** Cards mid-flight — hidden in the pile until they land (includes queue). */
  const [inFlightIds, setInFlightIds] = useState<Set<string>>(() => new Set())
  const [drama, setDrama] = useState<DramaKind>(null)
  const [dramaMsg, setDramaMsg] = useState<string | null>(null)
  const prevHeartsBroken = useRef(state.heartsBroken)
  const lastQueenTrick = useRef('')
  /** Card ids that have already completed (or started) a play flight this hand */
  const settledFlights = useRef(new Set<string>())
  const flightQueue = useRef<FlightState[]>([])
  const flightBusy = useRef(false)
  const dramaTimer = useRef<number | null>(null)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const prevPhase = useRef(state.phase)
  const [dealing, setDealing] = useState(false)
  const fxPrefs = useMemo(
    () => ({ hapticsEnabled }),
    [hapticsEnabled],
  )
  const pace = SPEED_TIMING[gameSpeed]
  const flightMs = pace.flightMs

  // Deal intro once per hand — skip on Fast / Instant or reduced motion
  useEffect(() => {
    if (state.handNumber <= 0) return
    if (gameSpeed === 'instant' || gameSpeed === 'fast') return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    setDealing(true)
    const t = window.setTimeout(() => setDealing(false), 1000)
    return () => window.clearTimeout(t)
  }, [state.handNumber, gameSpeed])

  const human = state.players[0]
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const selectedIds = useMemo(
    () => new Set(human.selectedPass.map((c) => c.id)),
    [human.selectedPass],
  )
  const flyingIds = inFlightIds

  const playerNames = useMemo(() => {
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[s] = state.players[s].name
    return names
  }, [state.players])

  const passFocus =
    state.phase === 'passing' || state.phase === 'receiving'

  const yourTurn =
    state.phase === 'playing' && state.whoseTurn === 0 && !flight

  const receivedFromName = useMemo(() => {
    if (state.phase !== 'receiving') return undefined
    const dir = state.passDirection
    if (dir === 'hold') return undefined
    // Inverse of pass: who is sending cards TO you this round
    return state.players[passSource(0, dir)].name
  }, [state.phase, state.passDirection, state.players])

  // Stable banter for the current beat (don't re-roll every render)
  const statusText = useMemo(() => {
    if (passFocus) {
      if (humorMode && state.phase === 'passing') return humorPass()
      return null
    }
    if (state.racingOut && autoFinishHand) {
      return '⚡ All points out — auto-finishing…'
    }
    if (state.racingOut) {
      return 'All points are out — play out the hand'
    }
    if (state.message && state.phase === 'trick_reveal') {
      if (!humorMode) return state.message
      const ptsMatch = state.message.match(/(\d+)\s*pt/)
      const pts = ptsMatch ? Number(ptsMatch[1]) : 0
      const nameMatch = state.message.match(/^(.+?)\s+(takes|wins)/i)
      if (nameMatch) return humorTrickWin(nameMatch[1], pts)
      return state.message
    }
    if (state.phase === 'playing' && state.whoseTurn != null) {
      const p = state.players[state.whoseTurn]
      if (p.isHuman) {
        return humorMode ? humorYourTurn() : 'Your turn — flick a card up to play'
      }
      return humorMode ? humorAiThinking(p.name) : `${p.name} is thinking…`
    }
    if (state.message) return state.message
    return ''
  }, [
    passFocus,
    humorMode,
    state.phase,
    state.racingOut,
    state.message,
    state.whoseTurn,
    state.players,
    autoFinishHand,
    // re-roll when trick count changes so lines refresh between tricks
    state.completedTricks.length,
  ])

  const overlayHumor = useMemo(() => {
    if (!humorMode) return null
    if (state.phase === 'game_over' && state.winner != null) {
      return humorMatchEnd(
        state.players[state.winner].name,
        state.winner === 0,
      )
    }
    if (state.phase === 'hand_result' && state.moonShooter != null) {
      return humorMoon(state.players[state.moonShooter].name)
    }
    return null
  }, [humorMode, state.phase, state.winner, state.moonShooter, state.players])

  const trickPlays =
    state.phase === 'trick_reveal' && state.lastTrick
      ? state.lastTrick.plays
      : state.currentTrick

  const fireDrama = useCallback((kind: DramaKind, message: string) => {
    if (dramaTimer.current != null) window.clearTimeout(dramaTimer.current)
    setDrama(kind)
    setDramaMsg(message)
    // Queen stays longer so it can't be missed
    const ms = kind === 'queen' ? 3200 : kind === 'hearts' ? 2200 : 1600
    dramaTimer.current = window.setTimeout(() => {
      setDrama(null)
      setDramaMsg(null)
      dramaTimer.current = null
    }, ms)
  }, [])

  // Hearts broken moment
  useEffect(() => {
    if (state.heartsBroken && !prevHeartsBroken.current) {
      fireDrama(
        'hearts',
        humorMode ? humorHeartsBroken() : '♥ Hearts are broken!',
      )
      fxHeartsBroken(fxPrefs)
    }
    prevHeartsBroken.current = state.heartsBroken
  }, [state.heartsBroken, fireDrama, fxPrefs, humorMode])

  // Queen of Spades taken (on trick complete)
  useEffect(() => {
    if (state.phase !== 'trick_reveal' || !state.lastTrick) return
    const key = state.lastTrick.plays.map((p) => p.card.id).join(',')
    if (key === lastQueenTrick.current) return
    lastQueenTrick.current = key
    const hasQueen = state.lastTrick.plays.some((p) => isQueenOfSpades(p.card))
    if (hasQueen) {
      const taker = state.players[state.lastTrick.winner]
      fireDrama(
        'queen',
        humorMode ? humorQueen() : `♠ ${taker.name} takes the Queen!`,
      )
      fxQueenTaken(fxPrefs)
    } else {
      fxTrickWin(fxPrefs)
    }
  }, [state.phase, state.lastTrick, state.players, fireDrama, fxPrefs, humorMode])

  // Your turn chime
  useEffect(() => {
    if (
      state.phase === 'playing' &&
      state.whoseTurn === 0 &&
      prevTurn.current !== 0
    ) {
      fxYourTurn(fxPrefs)
    }
    prevTurn.current = state.whoseTurn
  }, [state.phase, state.whoseTurn, fxPrefs])

  // Deal / hand-end cues
  useEffect(() => {
    if (state.phase === 'passing' && prevPhase.current !== 'passing') {
      fxDeal(fxPrefs)
    }
    if (
      (state.phase === 'hand_result' || state.phase === 'game_over') &&
      prevPhase.current !== 'hand_result' &&
      prevPhase.current !== 'game_over'
    ) {
      fxHandEnd(fxPrefs)
    }
    prevPhase.current = state.phase
  }, [state.phase, fxPrefs])

  // Illegal play toast → haptic/sound
  useEffect(() => {
    if (state.warning) fxIllegal(fxPrefs)
  }, [state.warning, fxPrefs])

  const startFlight = useCallback((next: FlightState) => {
    flightBusy.current = true
    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.add(next.card.id)
      return n
    })
    setFlight(next)
  }, [])

  const enqueueOrStart = useCallback(
    (next: FlightState) => {
      if (flightBusy.current) {
        // Don't stack two visuals for the same card
        if (flightQueue.current.some((f) => f.card.id === next.card.id)) {
          return
        }
        flightQueue.current.push(next)
        // Hide immediately even while queued
        setInFlightIds((prev) => {
          const n = new Set(prev)
          n.add(next.card.id)
          return n
        })
        return
      }
      startFlight(next)
    },
    [startFlight],
  )

  const finishFlight = useCallback(() => {
    const current = flight
    if (!current) {
      flightBusy.current = false
      return
    }
    const doneId = current.card.id
    const kind = current.kind
    const landed = current.card
    settledFlights.current.add(doneId)

    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.delete(doneId)
      return n
    })
    setFlight(null)

    // Human play & pass: commit only after the flight arrives
    if (kind === 'pass' || kind === 'play-in') {
      onCardClick(landed)
    }

    const next = flightQueue.current.shift()
    if (next) startFlight(next)
    else flightBusy.current = false
  }, [flight, onCardClick, startFlight])

  /** AI play flights only — human flights start from the hand click. */
  useLayoutEffect(() => {
    if (state.phase !== 'playing' && state.phase !== 'trick_reveal') return

    const plays =
      state.phase === 'trick_reveal' && state.lastTrick
        ? state.lastTrick.plays
        : state.currentTrick
    if (plays.length === 0) return

    for (const p of plays) {
      if (p.seat === 0) continue
      if (settledFlights.current.has(p.card.id)) continue
      if (inFlightIds.has(p.card.id)) continue

      settledFlights.current.add(p.card.id)

      const felt = document.querySelector(
        '[data-trick-felt]',
      ) as HTMLElement | null
      const from = seatOriginRect(p.seat)
      if (!from) continue
      const face = document.querySelector(
        `[data-trick-card="${p.card.id}"] .card`,
      ) as HTMLElement | null
      const to =
        face && face.getBoundingClientRect().width > 8
          ? rectOf(face)
          : felt
            ? trickSeatRect(felt, p.seat, p.card.id)
            : {
                left: window.innerWidth / 2 - 40,
                top: window.innerHeight / 2 - 56,
                width: 100,
                height: 140,
              }

      enqueueOrStart({
        kind: 'play-ai',
        card: p.card,
        from,
        to,
        size: 'hand',
        durationMs: flightMs,
      })
    }
  }, [
    state.phase,
    state.currentTrick,
    state.lastTrick,
    inFlightIds,
    enqueueOrStart,
    flightMs,
  ])

  // Clear per-hand flight tracking
  useEffect(() => {
    settledFlights.current = new Set()
    flightQueue.current = []
    flightBusy.current = false
    setInFlightIds(new Set())
    setFlight(null)
    lastQueenTrick.current = ''
  }, [state.handNumber])

  const handleHandClick = useCallback(
    (card: Card, el: HTMLElement) => {
      if (flightBusy.current || flight) return

      // —— Pass mode: fly into tray ——
      if (state.phase === 'passing') {
        if (selectedIds.has(card.id)) {
          onCardClick(card)
          return
        }
        if (human.selectedPass.length >= state.rules.passCount) {
          onCardClick(card)
          return
        }
        const slotIndex = human.selectedPass.length
        const slot = document.querySelector(
          `[data-pass-slot="${slotIndex}"]`,
        ) as HTMLElement | null
        if (!slot) {
          onCardClick(card)
          return
        }
        fxPassCard(fxPrefs)
        settledFlights.current.add(card.id)
        startFlight({
          kind: 'pass',
          card,
          from: rectOf(el),
          to: rectOf(slot),
          size: 'slot',
          durationMs: Math.min(flightMs, 280),
        })
        return
      }

      // —— Play: fly from exact hand card → pile, then commit ——
      if (state.phase === 'playing' && state.whoseTurn === 0) {
        if (legalIds.size > 0 && !legalIds.has(card.id)) {
          onCardClick(card)
          return
        }
        const from = rectOf(el)
        const felt = document.querySelector(
          '[data-trick-felt]',
        ) as HTMLElement | null
        const to = felt
          ? trickSeatRect(felt, 0)
          : {
              left: window.innerWidth / 2 - 50,
              top: window.innerHeight / 2 + 40,
              width: 110,
              height: 154,
            }
        settledFlights.current.add(card.id)
        fxPlayCard(fxPrefs)
        startFlight({
          kind: 'play-in',
          card,
          from,
          to,
          size: 'hand',
          durationMs: flightMs,
        })
        return
      }

      onCardClick(card)
    },
    [
      state.phase,
      state.whoseTurn,
      state.rules.passCount,
      flight,
      selectedIds,
      human.selectedPass.length,
      legalIds,
      onCardClick,
      fxPrefs,
      startFlight,
      flightMs,
    ],
  )

  // Wrap confirm pass with SFX
  const handleConfirmPass = useCallback(() => {
    fxPassConfirm(fxPrefs)
    onConfirmPass()
  }, [onConfirmPass, fxPrefs])

  // Pass: selected leave hand. Play-in flight: hide until commit.
  const passHandCards =
    state.phase === 'passing'
      ? human.hand.filter((c) => !selectedIds.has(c.id) && !flyingIds.has(c.id))
      : human.hand.filter((c) => !flyingIds.has(c.id))

  return (
    <div
      className={[
        'table-screen',
        passFocus ? 'table-screen--passing' : '',
        drama === 'hearts' ? 'table-screen--drama-hearts' : '',
        drama === 'queen' ? 'table-screen--drama-queen' : '',
        yourTurn ? 'table-screen--your-turn' : '',
        dealing ? 'table-screen--dealing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-felt={feltStyle}
    >
      <header className="table-top">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowMenu(true)}
          aria-label="Menu"
          title="Menu"
        >
          ⌂
        </button>
        <div className="table-top__center">
          <div className="table-top__brand">
            <span className="table-top__suit table-top__suit--l" aria-hidden>
              ♥
            </span>
            <h1 className="table-top__title">Hearts</h1>
            <span className="table-top__suit table-top__suit--r" aria-hidden>
              ♥
            </span>
          </div>
          <div className="table-top__meta">
            Hand {state.handNumber || 1} · race to {state.rules.raceTo}
            {state.heartsBroken ? ' · ♥ broken' : ' · ♥ locked'}
          </div>
        </div>
        <div className="table-top__actions">
          <button
            type="button"
            className="icon-btn icon-btn--score"
            onClick={() => setShowScores(true)}
            aria-label="Scores"
            title="Scores"
          >
            #
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowLast(true)}
            aria-label="Last trick"
            title="Last trick"
          >
            ↩
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onSettings}
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <div className="table-grid">
        <div className="table-grid__north">
          <PlayerSeat
            player={state.players[2]}
            position="north"
            isTurn={state.whoseTurn === 2}
            cardCount={state.players[2].hand.length}
            raceTo={state.rules.raceTo}
          />
        </div>

        <div className="table-grid__west">
          <PlayerSeat
            player={state.players[1]}
            position="west"
            isTurn={state.whoseTurn === 1}
            cardCount={state.players[1].hand.length}
            raceTo={state.rules.raceTo}
          />
        </div>

        <div className="table-grid__center">
          <TrickArea
            plays={trickPlays}
            playerNames={playerNames}
            reveal={state.phase === 'trick_reveal'}
            hiddenCardIds={flyingIds}
            holdMs={pace.holdMs}
          />
        </div>

        <div className="table-grid__east">
          <PlayerSeat
            player={state.players[3]}
            position="east"
            isTurn={state.whoseTurn === 3}
            cardCount={state.players[3].hand.length}
            raceTo={state.rules.raceTo}
          />
        </div>

        <div className="table-grid__south">
          {statusText && !passFocus && (
            <div
              className={`status-bar ${
                state.racingOut && autoFinishHand ? 'status-bar--racing' : ''
              } ${yourTurn ? 'status-bar--your-turn' : ''}`}
            >
              <span className="status-bar__text">{statusText}</span>
              <span className="status-bar__score-block">
                <span className="status-bar__match" title="Match score">
                  Score {human.totalScore}
                </span>
                <span
                  className={`status-bar__pill status-bar__pill--h ${
                    human.handHearts > 0 ? 'is-hot' : ''
                  }`}
                  title="Hearts this hand"
                >
                  ♥ {human.handHearts}
                </span>
                <span
                  className={`status-bar__pill status-bar__pill--q ${
                    human.hasQueen ? 'is-hot' : ''
                  }`}
                  title="Queen of Spades"
                >
                  ♠ {human.hasQueen ? 'Q' : '–'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {(state.phase === 'passing' || state.phase === 'receiving') && (
        <div className="pass-stage">
          <PassTray
            selected={
              state.phase === 'receiving' ? state.receivedCards : human.selectedPass
            }
            passCount={state.rules.passCount}
            direction={state.passDirection}
            handNumber={state.handNumber}
            receiving={state.phase === 'receiving'}
            receivedFromName={receivedFromName}
            onConfirm={
              state.phase === 'receiving' ? onAcceptReceived : handleConfirmPass
            }
            onRemove={state.phase === 'passing' ? onCardClick : undefined}
            nextSlotIndex={
              state.phase === 'passing' &&
              human.selectedPass.length < state.rules.passCount
                ? human.selectedPass.length
                : undefined
            }
          />
        </div>
      )}

      <footer
        className={`table-hand ${yourTurn ? 'table-hand--your-turn' : ''}`}
        data-seat-anchor="0"
      >
        <Hand
          cards={passHandCards}
          legalIds={
            state.phase === 'playing' && state.whoseTurn === 0
              ? legalIds
              : undefined
          }
          interactive={
            !flight &&
            state.phase !== 'receiving' &&
            (state.phase === 'passing' ||
              (state.phase === 'playing' && state.whoseTurn === 0))
          }
          passMode={state.phase === 'passing'}
          yourTurn={yourTurn}
          flyingIds={flyingIds}
          onCardClick={handleHandClick}
        />
      </footer>

      {flight && (
        <CardFlight
          key={flight.card.id}
          card={flight.card}
          from={flight.from}
          to={flight.to}
          size={flight.size}
          durationMs={flight.durationMs}
          onDone={finishFlight}
        />
      )}

      {/* Big center callouts for Queen / hearts — hard to miss */}
      {drama === 'queen' && dramaMsg && (
        <div className="drama-banner drama-banner--queen" role="status">
          <div className="drama-banner__icon">♠</div>
          <div className="drama-banner__text">
            <span className="drama-banner__eyebrow">Queen of Spades</span>
            <span className="drama-banner__title">{dramaMsg.replace(/^♠\s*/, '')}</span>
          </div>
        </div>
      )}
      {drama === 'hearts' && dramaMsg && (
        <div className="drama-banner drama-banner--hearts" role="status">
          <div className="drama-banner__icon">♥</div>
          <div className="drama-banner__text">
            <span className="drama-banner__eyebrow">Hearts</span>
            <span className="drama-banner__title">Hearts are broken!</span>
          </div>
        </div>
      )}

      <Toast
        message={
          state.warning
            ? humorMode
              ? `${humorIllegal()} ${state.warning}`
              : state.warning
            : null
        }
        tone="warn"
      />
      <Scoreboard
        state={state}
        open={showScores}
        onClose={() => setShowScores(false)}
      />
      <LastTrickModal
        open={showLast}
        trick={state.lastTrick}
        players={state.players}
        onClose={() => setShowLast(false)}
      />
      <Overlay
        state={state}
        onNextHand={onNextHand}
        onNewGame={onNewGame}
        onHome={onHome}
        humorMode={humorMode}
        humorLine={overlayHumor}
      />

      {showMenu && (
        <div className="table-menu" role="dialog" aria-label="Game menu">
          <button
            type="button"
            className="table-menu__backdrop"
            aria-label="Close menu"
            onClick={() => setShowMenu(false)}
          />
          <div className="table-menu__card">
            <h2 className="table-menu__title">Menu</h2>
            <p className="table-menu__sub">
              Progress is saved automatically. You can leave and come back anytime.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => setShowMenu(false)}
            >
              Keep playing
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={() => {
                setShowMenu(false)
                onHome()
              }}
            >
              Home (save progress)
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={() => {
                setShowMenu(false)
                onStartOver()
              }}
            >
              Start over
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg table-menu__danger"
              onClick={() => {
                setShowMenu(false)
                onAbandon()
              }}
            >
              Quit match
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { EuchreState } from '../games/euchre/engine'

import { trickWinner } from '../games/euchre/rules'
import { sortEuchreHand } from '../games/euchre/hand'
import { Card, Seat } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import { seatViewsFromEuchre } from '../games/tablePlayer'
import { PlayerSeat } from './PlayerSeat'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { CardView } from './CardView'
import { TableHeader } from './TableHeader'
import { TableMenu } from './TableMenu'
import { EuchreTrumpPanel } from './EuchreTrumpPanel'
import { EuchreLonerPanel } from './EuchreLonerPanel'
import { EuchreScoreboard } from './EuchreScoreboard'
import { EuchreOverlay } from './EuchreOverlay'
import { EuchreDramaBanners } from './EuchreDramaBanners'
import { LastTrickModal } from './LastTrickModal'
import { AchievementToast } from './AchievementToast'
import { CoachTips } from './CoachTips'
import { Toast } from './Toast'
import { gameCoachTips, hasSeenCoach } from '../coach'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { usePassReady } from '../hooks/usePassReady'
import { isHumanControlled, uiSeat, type HumanSeatsConfig } from '../passAndPlay'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { PassDeviceBanner } from './PassDeviceBanner'
import {
  humorEuchreAiThinking,
  humorEuchreIllegal,
  humorEuchreLoner,
  humorEuchreStick,
  humorEuchreTrickWin,
  humorEuchreTrump,
  humorEuchreYourTurn,
  humorActive,
  withHumor,
} from '../humor'
import {
  fxDeal,
  fxEuchreTrump,
  fxHandEnd,
  fxIllegal,
  fxPlayCard,
  fxTrickWin,
  fxYourTurn,
} from '../fx'
import './Table.css'
import './Overlay.css'
import { EuchrePlayerHud } from './EuchrePlayerHud'
import { EuchreTrumpChip } from './EuchreTrumpChip'
import { EuchreDiscardPanel } from './EuchreDiscardPanel'
import { EuchreTrumpCallRecap } from './EuchreTrumpCallRecap'
import './EuchreTrumpPanel.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  legal: Card[]
  feltStyle?: string
  hapticsEnabled?: boolean
  soundEnabled?: boolean
  humorMode?: boolean
  leftHandLayout?: boolean
  passAndPlay?: boolean
  humanSeats?: HumanSeatsConfig
  gameSpeed?: GameSpeed
  coachTipsEnabled?: boolean
  onCardClick: (card: import('../core/types').Card) => void
  onPass: () => void
  onOrderUp: () => void
  onNameTrump: (suit: import('../core/types').Suit) => void
  onGoAlone: () => void
  onWithPartner: () => void
  onAckTrumpCall: () => void
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
  achievementToast?: import('../hooks/useAchievementToast').ToastUnlock | null
  onAchievementDone?: () => void
}

interface FlightState {
  kind: 'play-ai' | 'play-in'
  card: Card
  from: FlightRect
  to: FlightRect
  durationMs: number
}

export function EuchreTable({
  state,
  legal,
  feltStyle = 'green',
  hapticsEnabled = true,
  soundEnabled = false,
  humorMode = false,
  leftHandLayout = false,
  passAndPlay = false,
  humanSeats = { 0: true, 1: false, 2: false, 3: false },
  gameSpeed = 'fast',
  coachTipsEnabled = true,
  onCardClick,
  onPass,
  onOrderUp,
  onNameTrump,
  onGoAlone,
  onWithPartner,
  onAckTrumpCall,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onSettings,
  onStartOver,
  onAbandon,
  achievementToast,
  onAchievementDone,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showLast, setShowLast] = useState(false)
  const [coachOpen, setCoachOpen] = useState(
    () => coachTipsEnabled && !hasSeenCoach('euchre'),
  )
  const [peekFinalTrick, setPeekFinalTrick] = useState(false)
  const [flight, setFlight] = useState<FlightState | null>(null)
  const [inFlightIds, setInFlightIds] = useState<Set<string>>(() => new Set())
  const [dealing, setDealing] = useState(false)
  const [drama, setDrama] = useState<'trump' | 'march' | 'euchre' | 'stick' | 'loner' | null>(null)
  const [dramaMsg, setDramaMsg] = useState<string | null>(null)
  const [dramaSub, setDramaSub] = useState<string | null>(null)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const prevTrickLen = useRef(state.currentTrick.length)
  const prevPhase = useRef(state.phase)
  const prevTrump = useRef(state.trump)
  const prevStickWarning = useRef(false)
  const dramaTimer = useRef<number | null>(null)
  const settledFlights = useRef(new Set<string>())
  const flightQueue = useRef<FlightState[]>([])
  const flightBusy = useRef(false)
  const pace = SPEED_TIMING[gameSpeed]
  const flightMs = pace.flightMs
  const fxPrefs = useMemo(() => ({ hapticsEnabled, soundEnabled }), [hapticsEnabled, soundEnabled])
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const pp = useMemo(() => ({ passAndPlay, humanSeats }), [passAndPlay, humanSeats])
  const you = useMemo(() => uiSeat(state, pp), [state.whoseTurn, pp])
  const { showPass, acknowledge, canAct } = usePassReady(state.whoseTurn, pp)
  const passDeviceMode = useMemo((): import('./PassDeviceBanner').PassDeviceMode => {
    if (state.phase === 'bidding') return 'bid'
    if (state.phase === 'discard') return 'discard'
    if (state.phase === 'loner_choice') return 'loner'
    return 'turn'
  }, [state.phase])
  const humanTurn =
    state.whoseTurn != null && isHumanControlled(state.whoseTurn, pp) && canAct
  const yourTurn =
    humanTurn && state.phase === 'playing' && state.whoseTurn === you && !flight
  const yourBidTurn = humanTurn && state.phase === 'bidding' && state.whoseTurn === you
  const yourDiscard = humanTurn && state.phase === 'discard' && state.whoseTurn === you
  const yourLonerChoice =
    humanTurn && state.phase === 'loner_choice' && state.whoseTurn === you

  const seats = useMemo(
    () => seatViewsFromEuchre(state.players, state.trump, state.sittingOut),
    [state.players, state.trump, state.sittingOut],
  )

  const playerNames = useMemo(() => {
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[s] = state.players[s].name
    return names
  }, [state.players])

  const resolveWinner = useCallback(
    (plays: Parameters<typeof trickWinner>[0]) =>
      state.trump ? trickWinner(plays, state.trump) : 0,
    [state.trump],
  )

  const fireDrama = useCallback(
    (kind: 'trump' | 'march' | 'euchre' | 'stick' | 'loner', message: string, subtitle?: string) => {
      if (dramaTimer.current != null) window.clearTimeout(dramaTimer.current)
      setDrama(kind)
      setDramaMsg(message)
      setDramaSub(subtitle ?? null)
      const ms = kind === 'march' || kind === 'euchre' ? 2200 : 1900
      dramaTimer.current = window.setTimeout(() => {
        setDrama(null)
        setDramaMsg(null)
        setDramaSub(null)
        dramaTimer.current = null
      }, ms)
    },
    [],
  )

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
        if (flightQueue.current.some((f) => f.card.id === next.card.id)) return
        flightQueue.current.push(next)
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
    settledFlights.current.add(current.card.id)
    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.delete(current.card.id)
      return n
    })
    setFlight(null)
    if (current.kind === 'play-in') {
      onCardClick(current.card)
    }
    const queued = flightQueue.current.shift()
    if (queued) startFlight(queued)
    else flightBusy.current = false
  }, [flight, onCardClick, startFlight])

  useLayoutEffect(() => {
    if (state.phase !== 'playing') return
    const plays = state.currentTrick
    if (plays.length === 0) return

    for (const p of plays) {
      if (isHumanControlled(p.seat, pp)) continue
      if (settledFlights.current.has(p.card.id)) continue
      if (inFlightIds.has(p.card.id)) continue

      settledFlights.current.add(p.card.id)

      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
      const from = seatOriginRect(p.seat)
      if (!from) continue
      const to = felt
        ? trickSeatRect(felt, p.seat, p.card.id)
        : {
            left: window.innerWidth / 2 - 50,
            top: window.innerHeight / 2 + 40,
            width: 110,
            height: 154,
          }

      enqueueOrStart({
        kind: 'play-ai',
        card: p.card,
        from,
        to,
        durationMs: flightMs,
      })
    }
  }, [state.phase, state.currentTrick, inFlightIds, enqueueOrStart, flightMs, pp])

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.lastTrick) {
      setInFlightIds(new Set())
      flightQueue.current = []
      flightBusy.current = false
      setFlight(null)
      for (const p of state.lastTrick.plays) {
        settledFlights.current.add(p.card.id)
      }
    }
    if (state.currentTrick.length < prevTrickLen.current) {
      settledFlights.current.clear()
    }
    prevTrickLen.current = state.currentTrick.length
  }, [state.phase, state.lastTrick, state.currentTrick.length])

  useEffect(() => {
    settledFlights.current.clear()
    flightQueue.current = []
    flightBusy.current = false
    setInFlightIds(new Set())
    setFlight(null)
  }, [state.handNumber])

  useEffect(() => {
    if (state.trump && !prevTrump.current) {
      fxEuchreTrump(fxPrefs)
      const label = SUIT_SYMBOL[state.trump]
      fireDrama(
        'trump',
        humorMode && humorActive() ? humorEuchreTrump() : `${label} is trump`,
        state.maker != null ? `${state.players[state.maker].name} called it` : undefined,
      )
    }
    prevTrump.current = state.trump
  }, [state.trump, state.maker, state.players, fireDrama, fxPrefs, humorMode])

  useEffect(() => {
    const prev = prevPhase.current
    if (
      state.phase === 'hand_result' &&
      prev !== 'hand_result' &&
      prev !== 'game_over'
    ) {
      fxHandEnd(fxPrefs)
      const summary = state.lastHandSummary
      if (summary?.marched) {
        fireDrama(
          'march',
          humorMode ? 'March — all five!' : 'March — makers swept all five',
          summary.loner ? 'Loner march' : undefined,
        )
      } else if (summary?.euchred) {
        fireDrama(
          'euchre',
          humorMode ? 'Euchred!' : 'Euchred — defenders take the point',
        )
      }
    }
    prevPhase.current = state.phase
  }, [state.phase, state.lastHandSummary, fireDrama, fxPrefs, humorMode])

  useEffect(() => {
    if (state.warning?.toLowerCase().includes('goes alone')) {
      fireDrama(
        'loner',
        withHumor('Loner — partner sits out', humorEuchreLoner, humorMode),
      )
    }
  }, [state.warning, fireDrama, humorMode])

  useEffect(() => {
    const stick = Boolean(state.warning?.toLowerCase().includes('stick the dealer'))
    if (stick && !prevStickWarning.current) {
      fireDrama('stick', withHumor('Stick the dealer', humorEuchreStick, humorMode))
    }
    prevStickWarning.current = stick
  }, [state.warning, fireDrama, humorMode])

  useEffect(() => {
    if (state.warning && /illegal|not a legal/i.test(state.warning)) {
      fxIllegal(fxPrefs)
    }
  }, [state.warning, fxPrefs])

  useEffect(() => {
    if (state.handNumber <= 0) return
    if (gameSpeed === 'instant') return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    setDealing(true)
    fxDeal(fxPrefs)
    const ms = gameSpeed === 'fast' ? 720 : gameSpeed === 'slow' ? 1400 : 1100
    const t = window.setTimeout(() => setDealing(false), ms)
    return () => window.clearTimeout(t)
  }, [state.handNumber, gameSpeed, fxPrefs])

  useEffect(() => {
    if (state.whoseTurn === you && prevTurn.current !== you) {
      if (state.phase === 'playing') fxYourTurn(fxPrefs)
    }
    prevTurn.current = state.whoseTurn
  }, [state.whoseTurn, state.phase, fxPrefs])

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.lastTrick) fxTrickWin(fxPrefs)
  }, [state.phase, state.lastTrick, fxPrefs])

  const statusText = useMemo(() => {
    if (state.phase === 'trick_reveal' && state.message && humorMode) {
      const nameMatch = state.message.match(/^(.+?)\s+wins/)
      if (nameMatch) return humorEuchreTrickWin(nameMatch[1])
    }
    if (state.message && state.phase !== 'trick_reveal') return state.message
    if (yourBidTurn) return humorMode ? 'Your bid — order up or pass' : 'Your bid'
    if (yourDiscard && state.maker != null && state.trump) {
      const maker = state.players[state.maker].name
      const sym = SUIT_SYMBOL[state.trump]
      return humorMode
        ? `${maker} ordered ${sym} — chuck one of your six. Not a pass!`
        : `${maker} ordered ${sym} trump — discard one card`
    }
    if (yourLonerChoice) return humorMode ? 'Go alone for glory (+4 march)' : 'Go alone?'
    if (yourTurn) return withHumor('Your turn', humorEuchreYourTurn, humorMode)
    if (state.whoseTurn != null) {
      const p = state.players[state.whoseTurn]
      return withHumor(`${p.name}…`, () => humorEuchreAiThinking(p.name), humorMode)
    }
    return null
  }, [state, yourBidTurn, yourDiscard, yourLonerChoice, yourTurn, humorMode])

  const handleHandClick = useCallback(
    (card: Card, el: HTMLElement) => {
      if (state.phase === 'discard' && state.whoseTurn === you) {
        fxPlayCard(fxPrefs)
        onCardClick(card)
        return
      }
      if (state.phase !== 'playing' || state.whoseTurn !== you) return
      if (flightBusy.current || flight) return
      if (legalIds.size > 0 && !legalIds.has(card.id)) {
        onCardClick(card)
        return
      }
      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
      const to = felt
        ? trickSeatRect(felt, you)
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
        from: rectOf(el),
        to,
        durationMs: flightMs,
      })
    },
    [
      state.phase,
      state.whoseTurn,
      flight,
      legalIds,
      onCardClick,
      fxPrefs,
      startFlight,
      flightMs,
    ],
  )

  const showLastTrickOnTable =
    (state.phase === 'trick_reveal' ||
      (state.phase === 'hand_result' && peekFinalTrick)) &&
    state.lastTrick
  const trickPlays = showLastTrickOnTable ? state.lastTrick!.plays : state.currentTrick
  const trickReveal =
    state.phase === 'trick_reveal' || (state.phase === 'hand_result' && peekFinalTrick)

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.players[0].hand.length === 0) {
      setPeekFinalTrick(true)
      return
    }
    if (state.phase === 'hand_result') {
      setPeekFinalTrick(true)
      const t = window.setTimeout(() => setPeekFinalTrick(false), 500)
      return () => window.clearTimeout(t)
    }
    setPeekFinalTrick(false)
  }, [state.phase, state.handNumber])

  const trumpLabel = state.trump ? SUIT_SYMBOL[state.trump] : '—'
  const makerName = state.maker != null ? state.players[state.maker].name : null
  const showTrumpChip =
    state.trump != null &&
    state.phase !== 'bidding' &&
    state.phase !== 'idle' &&
    state.phase !== 'game_over'
  const pickedUpHighlight = useMemo(
    () =>
      state.pickedUpCard && yourDiscard
        ? new Set([state.pickedUpCard.id])
        : undefined,
    [state.pickedUpCard, yourDiscard],
  )
  const kittyLockedIds = useMemo(
    () =>
      yourDiscard && state.pickedUpCard ? new Set([state.pickedUpCard.id]) : undefined,
    [yourDiscard, state.pickedUpCard],
  )
  const yourHand = useMemo(
    () => sortEuchreHand(state.players[you].hand, state.trump),
    [state.players, you, state.trump],
  )
  const showKitty =
    state.phase === 'bidding' && state.kitty.length > 0 && !state.awaitingTrumpAck
  const showBidPanels =
    (yourBidTurn || yourDiscard || yourLonerChoice) && !state.awaitingTrumpAck

  return (
    <div
      className={[
        'table-screen',
        'table-screen--euchre',
        `table-screen--felt-${feltStyle}`,
        dealing ? 'table-screen--dealing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-felt={feltStyle}
    >
      <TableHeader
        gameLabel="Euchre"
        gameIcon="♦"
        handNumber={state.handNumber}
        raceTo={state.rules.raceTo}
        metaExtra={
          state.loner
            ? `Loner · ${trumpLabel}`
            : state.trump
              ? `Trump ${trumpLabel}`
              : 'Bidding'
        }
        onOpenMenu={() => setShowMenu(true)}
        onOpenScores={() => setShowScores(true)}
        onOpenLastTrick={() => setShowLast(true)}
        onSettings={onSettings}
      />

      <div className="table-grid">
        <div className="table-grid__north">
          <PlayerSeat
            player={seats[2]}
            position="north"
            isTurn={state.whoseTurn === 2}
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === 2}
          />
        </div>
        <div className="table-grid__west">
          <PlayerSeat
            player={seats[1]}
            position="west"
            isTurn={state.whoseTurn === 1}
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === 1}
          />
        </div>
        <div className="table-grid__center">
          <EuchreDramaBanners
            drama={drama === 'trump' ? drama : null}
            message={drama === 'trump' ? dramaMsg : null}
            subtitle={drama === 'trump' ? dramaSub : null}
            centered
          />
          {showTrumpChip && (
            <EuchreTrumpChip trump={state.trump!} makerName={makerName} />
          )}
          <TrickArea
            plays={trickPlays}
            playerNames={playerNames}
            reveal={trickReveal}
            hiddenCardIds={inFlightIds}
            holdMs={pace.holdMs}
            resolveWinner={resolveWinner}
          />
          {statusText && (
            <p className="spades-status" role="status">
              {statusText}
            </p>
          )}
        </div>
        <div className="table-grid__east">
          <PlayerSeat
            player={seats[3]}
            position="east"
            isTurn={state.whoseTurn === 3}
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === 3}
          />
        </div>
        <div className="table-grid__south">
          <EuchrePlayerHud
            state={state}
            yourSeat={you}
            active={yourTurn || yourBidTurn || yourDiscard || yourLonerChoice}
          />
        </div>
      </div>

      {state.awaitingTrumpAck && state.trump && state.maker != null && state.trumpCallMethod && (
        <EuchreTrumpCallRecap
          makerName={state.players[state.maker].name}
          dealerName={state.players[state.dealer].name}
          trump={state.trump}
          method={state.trumpCallMethod}
          pickedUpCard={state.pickedUpCard}
          turnedDownSuit={state.turnedDownSuit}
          onContinue={onAckTrumpCall}
        />
      )}

      {(showKitty || showBidPanels) && (
        <div className="euchre-table-stage">
          {showKitty && (
            <div
              className={[
                'euchre-kitty',
                state.upcard ? 'euchre-kitty--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label="Kitty"
            >
              <span className="euchre-kitty__label">
                {state.upcard ? 'Kitty — order this suit?' : 'Kitty — turned down'}
              </span>
              <div className="euchre-kitty__stack">
                {state.kitty.map((card, i) => {
                  const isTop = i === state.kitty.length - 1
                  const faceUp = isTop && Boolean(state.upcard)
                  return (
                    <div
                      key={card.id}
                      className={[
                        'euchre-kitty__card',
                        faceUp ? 'euchre-kitty__card--up' : 'euchre-kitty__card--down',
                      ].join(' ')}
                      style={{ '--kitty-i': i } as CSSProperties}
                    >
                      {faceUp && state.upcard ? (
                        <CardView card={state.upcard} size="hand" />
                      ) : (
                        <CardView card={card} size="hand" faceDown />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {showBidPanels && yourLonerChoice && (
            <EuchreLonerPanel onGoAlone={onGoAlone} onWithPartner={onWithPartner} />
          )}
          {showBidPanels && yourBidTurn && (
            <EuchreTrumpPanel
              round={state.biddingRound}
              upcardSuit={state.upcard?.suit}
              turnedDown={state.turnedDownSuit}
              canOrder={state.biddingRound === 1}
              canName={state.biddingRound === 2}
              onPass={onPass}
              onOrderUp={onOrderUp}
              onNameTrump={onNameTrump}
            />
          )}
          {showBidPanels &&
            yourDiscard &&
            state.trump &&
            state.maker != null &&
            state.pickedUpCard && (
              <EuchreDiscardPanel
                makerName={state.players[state.maker].name}
                trump={state.trump}
                pickedUpCard={state.pickedUpCard}
              />
            )}
        </div>
      )}

      <footer
        className={`table-hand ${yourTurn || yourDiscard ? 'table-hand--your-turn' : ''}`}
        data-seat-anchor={String(you)}
      >
        <Hand
          leftHandLayout={leftHandLayout}
          cards={yourHand}
          legalIds={yourTurn || yourDiscard ? legalIds : undefined}
          highlightIds={pickedUpHighlight}
          lockedIds={kittyLockedIds}
          interactive={yourTurn || yourDiscard}
          yourTurn={yourTurn || yourDiscard}
          flyingIds={inFlightIds}
          onCardClick={handleHandClick}
        />
      </footer>

      <EuchreDramaBanners
        drama={drama && drama !== 'trump' ? drama : null}
        message={drama && drama !== 'trump' ? dramaMsg : null}
        subtitle={drama && drama !== 'trump' ? dramaSub : null}
      />

      {flight && (
        <CardFlight
          key={flight.card.id}
          card={flight.card}
          from={flight.from}
          to={flight.to}
          size="hand"
          durationMs={flight.durationMs}
          onDone={finishFlight}
        />
      )}

      <Toast
        message={
          state.warning && humorMode && /illegal|not a legal/i.test(state.warning)
            ? humorEuchreIllegal()
            : state.warning
        }
        tone="warn"
      />
      {showPass && state.whoseTurn != null && (
        <PassDeviceBanner
          playerName={state.players[state.whoseTurn].name}
          onReady={acknowledge}
          mode={passDeviceMode}
        />
      )}
      <CoachTips
        open={coachOpen}
        onDone={() => setCoachOpen(false)}
        tips={gameCoachTips('euchre', pp)}
        gameId="euchre"
      />
      <EuchreScoreboard state={state} open={showScores} onClose={() => setShowScores(false)} />
      <LastTrickModal
        open={showLast}
        trick={state.lastTrick}
        playerNames={playerNames}
        resolveWinner={resolveWinner}
        gameIcon="♦"
        gameLabel="Last trick"
        onClose={() => setShowLast(false)}
      />
      <AchievementToast
        achievement={achievementToast ?? null}
        soundEnabled={soundEnabled}
        hapticsEnabled={hapticsEnabled}
        onDone={() => onAchievementDone?.()}
      />
      <EuchreOverlay
        state={state}
        passPlay={pp}
        humorMode={humorMode}
        onNextHand={onNextHand}
        onShowMatchResults={onShowMatchResults}
        onNewGame={onNewGame}
        onHome={onHome}
        onReviewLastTrick={() => setShowLast(true)}
      />

      <TableMenu
        open={showMenu}
        gameLabel="Euchre"
        gameIcon="♦"
        onClose={() => setShowMenu(false)}
        onSettings={onSettings}
        onHome={onHome}
        onStartOver={onStartOver}
        onAbandon={onAbandon}
      />
    </div>
  )
}
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { EuchreState } from '../games/euchre/engine'

import { trickWinner } from '../games/euchre/rules'
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
import { hasSeenCoach, EUCHRE_COACH_TIPS } from '../coach'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import {
  humorEuchreAiThinking,
  humorEuchreEuchred,
  humorEuchreIllegal,
  humorEuchreLoner,
  humorEuchreMarch,
  humorEuchreStick,
  humorEuchreTrickWin,
  humorEuchreTrump,
  humorEuchreYourTurn,
} from '../humor'
import { YOUR_TEAM } from '../games/euchre/labels'
import { fxDeal, fxHandEnd, fxIllegal, fxPlayCard, fxTrickWin, fxYourTurn } from '../fx'
import './Table.css'
import './Overlay.css'
import { EuchrePlayerHud } from './EuchrePlayerHud'
import './EuchreTrumpPanel.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  legal: Card[]
  feltStyle?: string
  hapticsEnabled?: boolean
  humorMode?: boolean
  gameSpeed?: GameSpeed
  onCardClick: (card: import('../core/types').Card) => void
  onPass: () => void
  onOrderUp: () => void
  onNameTrump: (suit: import('../core/types').Suit) => void
  onGoAlone: () => void
  onWithPartner: () => void
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
  humorMode = false,
  gameSpeed = 'fast',
  onCardClick,
  onPass,
  onOrderUp,
  onNameTrump,
  onGoAlone,
  onWithPartner,
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
  const [coachOpen, setCoachOpen] = useState(() => !hasSeenCoach('euchre'))
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
  const fxPrefs = useMemo(() => ({ hapticsEnabled }), [hapticsEnabled])
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const yourTurn = state.phase === 'playing' && state.whoseTurn === 0 && !flight
  const yourBidTurn = state.phase === 'bidding' && state.whoseTurn === 0
  const yourDiscard = state.phase === 'discard' && state.whoseTurn === 0
  const yourLonerChoice = state.phase === 'loner_choice' && state.whoseTurn === 0

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
      if (p.seat === 0) continue
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
  }, [state.phase, state.currentTrick, inFlightIds, enqueueOrStart, flightMs])

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
      const label = SUIT_SYMBOL[state.trump]
      fireDrama(
        'trump',
        humorMode ? humorEuchreTrump() : `${label} is trump`,
        state.maker != null ? `${state.players[state.maker].name} called it` : undefined,
      )
    }
    prevTrump.current = state.trump
  }, [state.trump, state.maker, state.players, fireDrama, humorMode])

  useEffect(() => {
    const prev = prevPhase.current
    if (
      state.phase === 'hand_result' &&
      prev !== 'hand_result' &&
      prev !== 'game_over'
    ) {
      fxHandEnd(fxPrefs)
      const summary = state.lastHandSummary
      if (summary) {
        const ourTeamMaker = summary.makerTeam === YOUR_TEAM
        if (summary.marched && ourTeamMaker) {
          fireDrama('march', humorMode ? humorEuchreMarch() : 'March — all five tricks!')
        } else if (summary.euchred && !ourTeamMaker) {
          fireDrama('euchre', humorMode ? humorEuchreEuchred() : 'Euchre — makers set!')
        }
      }
    }
    prevPhase.current = state.phase
  }, [state.phase, state.lastHandSummary, fireDrama, fxPrefs, humorMode])

  useEffect(() => {
    if (state.warning?.toLowerCase().includes('goes alone')) {
      fireDrama('loner', humorMode ? humorEuchreLoner() : 'Loner — partner sits out')
    }
  }, [state.warning, fireDrama, humorMode])

  useEffect(() => {
    const stick = Boolean(state.warning?.toLowerCase().includes('stick the dealer'))
    if (stick && !prevStickWarning.current) {
      fireDrama('stick', humorMode ? humorEuchreStick() : 'Stick the dealer')
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
    if (state.whoseTurn === 0 && prevTurn.current !== 0) {
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
    if (yourDiscard) return humorMode ? 'Discard one — dealer picks up trump' : 'Discard one card'
    if (yourLonerChoice) return humorMode ? 'Go alone for glory (+4 march)' : 'Go alone?'
    if (yourTurn) return humorMode ? humorEuchreYourTurn() : 'Your turn'
    if (state.whoseTurn != null) {
      const p = state.players[state.whoseTurn]
      return humorMode ? humorEuchreAiThinking(p.name) : `${p.name}…`
    }
    return null
  }, [state, yourBidTurn, yourDiscard, yourLonerChoice, yourTurn, humorMode])

  const handleHandClick = useCallback(
    (card: Card, el: HTMLElement) => {
      if (state.phase === 'discard' && state.whoseTurn === 0) {
        fxPlayCard(fxPrefs)
        onCardClick(card)
        return
      }
      if (state.phase !== 'playing' || state.whoseTurn !== 0) return
      if (flightBusy.current || flight) return
      if (legalIds.size > 0 && !legalIds.has(card.id)) {
        onCardClick(card)
        return
      }
      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
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
    (state.phase === 'trick_reveal' || state.phase === 'hand_result') && state.lastTrick
  const trickPlays = showLastTrickOnTable ? state.lastTrick!.plays : state.currentTrick
  const trickReveal = state.phase === 'trick_reveal'

  const trumpLabel = state.trump ? SUIT_SYMBOL[state.trump] : '—'

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
          {state.upcard && state.phase === 'bidding' && state.biddingRound === 1 && (
            <div className="euchre-upcard" aria-label="Upcard">
              <span className="euchre-upcard__label">Upcard</span>
              <CardView card={state.upcard} size="hand" />
            </div>
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
            active={yourTurn || yourBidTurn || yourDiscard || yourLonerChoice}
          />
        </div>
      </div>

      {(yourBidTurn || yourDiscard || yourLonerChoice) && (
        <div className="euchre-bid-stage">
          {yourLonerChoice && (
            <EuchreLonerPanel onGoAlone={onGoAlone} onWithPartner={onWithPartner} />
          )}
          {yourBidTurn && (
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
          {yourDiscard && (
            <div className="euchre-trump">
              <h2 className="euchre-trump__title">Discard one card</h2>
              <p className="euchre-trump__eyebrow">Tap a card in your hand</p>
            </div>
          )}
        </div>
      )}

      <footer className={`table-hand ${yourTurn || yourDiscard ? 'table-hand--your-turn' : ''}`}>
        <Hand
          cards={state.players[0].hand}
          legalIds={yourTurn || yourDiscard ? legalIds : undefined}
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
      <CoachTips
        open={coachOpen}
        onDone={() => setCoachOpen(false)}
        tips={EUCHRE_COACH_TIPS}
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
        onDone={() => onAchievementDone?.()}
      />
      <EuchreOverlay
        state={state}
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SpadesState } from '../games/spades/engine'
import { trickWinner } from '../games/spades/rules'
import { Card, Seat } from '../core/types'
import { seatViewsFromSpades } from '../games/tablePlayer'
import { PlayerSeat } from './PlayerSeat'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { TableHeader } from './TableHeader'
import { TableMenu } from './TableMenu'
import { SpadesBidPanel, type BidChoice } from './SpadesBidPanel'
import { SpadesScoreboard } from './SpadesScoreboard'
import { SpadesOverlay } from './SpadesOverlay'
import { LastTrickModal } from './LastTrickModal'
import { AchievementToast } from './AchievementToast'
import { Toast } from './Toast'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { fxPlayCard, fxTrickWin, fxYourTurn } from '../fx'
import './Table.css'
import './SpadesTable.css'

interface Props {
  state: SpadesState
  legal: Card[]
  feltStyle?: string
  hapticsEnabled?: boolean
  gameSpeed?: GameSpeed
  onCardClick: (card: Card) => void
  onSubmitBid: (choice: BidChoice) => void
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
  card: Card
  from: FlightRect
  to: FlightRect
  durationMs: number
}

export function SpadesTable({
  state,
  legal,
  feltStyle = 'green',
  hapticsEnabled = true,
  gameSpeed = 'fast',
  onCardClick,
  onSubmitBid,
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
  const [showLast, setShowLast] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [flight, setFlight] = useState<FlightState | null>(null)
  const [inFlightIds, setInFlightIds] = useState<Set<string>>(() => new Set())
  const [dealing, setDealing] = useState(false)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const prevTrickLen = useRef(state.currentTrick.length)
  const settledFlights = useRef(new Set<string>())

  const seats = useMemo(() => seatViewsFromSpades(state.players), [state.players])
  const pace = SPEED_TIMING[gameSpeed]
  const fxPrefs = useMemo(() => ({ hapticsEnabled }), [hapticsEnabled])
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const yourTurn = state.phase === 'playing' && state.whoseTurn === 0 && !flight
  const humanBidTurn = state.phase === 'bidding' && state.whoseTurn === 0

  const playerNames = useMemo(() => {
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[s] = state.players[s].name
    return names
  }, [state.players])

  const resolveWinner = useCallback(
    (plays: Parameters<typeof trickWinner>[0]) => trickWinner(plays, state.spadesBroken),
    [state.spadesBroken],
  )

  useEffect(() => {
    if (state.handNumber <= 0) return
    if (gameSpeed === 'instant') return
    setDealing(true)
    const ms = gameSpeed === 'fast' ? 720 : gameSpeed === 'slow' ? 1400 : 1100
    const t = window.setTimeout(() => setDealing(false), ms)
    return () => window.clearTimeout(t)
  }, [state.handNumber, gameSpeed])

  useEffect(() => {
    if (state.whoseTurn === 0 && prevTurn.current !== 0) {
      if (state.phase === 'playing') fxYourTurn(fxPrefs)
    }
    prevTurn.current = state.whoseTurn
  }, [state.whoseTurn, state.phase, fxPrefs])

  useEffect(() => {
    const len = state.currentTrick.length
    if (len > prevTrickLen.current && len > 0) {
      const play = state.currentTrick[len - 1]
      if (settledFlights.current.has(play.card.id)) return
      settledFlights.current.add(play.card.id)
      const seat = play.seat
      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
      let from = seatOriginRect(seat)
      if (seat === 0) {
        const el = document.querySelector(
          `[data-hand-card-id="${play.card.id}"]`,
        ) as HTMLElement | null
        if (el) from = rectOf(el)
      }
      const to = felt
        ? trickSeatRect(felt, seat, play.card.id)
        : {
            left: window.innerWidth / 2 - 50,
            top: window.innerHeight / 2 + 40,
            width: 110,
            height: 154,
          }
      if (!from) return
      setInFlightIds((s) => new Set(s).add(play.card.id))
      setFlight({
        card: play.card,
        from,
        to,
        durationMs: pace.flightMs,
      })
      if (seat === 0) fxPlayCard(fxPrefs)
    }
    if (len < prevTrickLen.current) settledFlights.current.clear()
    prevTrickLen.current = len
  }, [state.currentTrick, fxPrefs, pace.flightMs])

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.lastTrick) {
      fxTrickWin(fxPrefs)
    }
  }, [state.phase, state.lastTrick, fxPrefs])

  const statusText = useMemo(() => {
    if (state.phase === 'bidding') {
      if (humanBidTurn) return 'Your bid'
      const seat = state.whoseTurn
      if (seat != null) return `${state.players[seat].name} is bidding…`
      return 'Bidding'
    }
    if (state.message) return state.message
    if (yourTurn) return 'Your turn'
    if (state.whoseTurn != null) return `${state.players[state.whoseTurn].name} is thinking…`
    return null
  }, [state, humanBidTurn, yourTurn])

  const finishFlight = useCallback(() => {
    setFlight((f) => {
      if (f) {
        setInFlightIds((ids) => {
          const next = new Set(ids)
          next.delete(f.card.id)
          return next
        })
      }
      return null
    })
  }, [])

  const handleHandClick = useCallback(
    (card: Card) => {
      if (!yourTurn) return
      onCardClick(card)
    },
    [yourTurn, onCardClick],
  )

  return (
    <div
      className={[
        'table-screen',
        'table-screen--spades',
        dealing ? 'table-screen--dealing' : '',
        humanBidTurn ? 'table-screen--bidding' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-felt={feltStyle}
    >
      <TableHeader
        gameLabel="Spades"
        gameIcon="♠"
        handNumber={state.handNumber}
        raceTo={state.rules.raceTo}
        metaExtra={state.spadesBroken ? '♠ broken' : '♠ unbroken'}
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
          />
        </div>
        <div className="table-grid__west">
          <PlayerSeat
            player={seats[1]}
            position="west"
            isTurn={state.whoseTurn === 1}
            raceTo={state.rules.raceTo}
          />
        </div>
        <div className="table-grid__center">
          <TrickArea
            plays={state.currentTrick}
            playerNames={playerNames}
            reveal={state.phase === 'trick_reveal'}
            hiddenCardIds={inFlightIds}
            holdMs={pace.holdMs}
            resolveWinner={resolveWinner}
          />
          {state.phase === 'bidding' && (
            <div className="spades-bid-track" aria-label="Bids this hand">
              {([0, 1, 2, 3] as Seat[]).map((seat) => {
                const bid = state.bids[seat]
                const waiting = state.whoseTurn === seat && bid == null
                const label =
                  bid == null
                    ? waiting
                      ? '…'
                      : '–'
                    : bid.blindNil
                      ? 'B∅'
                      : bid.nil
                        ? '∅'
                        : String(bid.bid)
                return (
                  <div
                    key={seat}
                    className={[
                      'spades-bid-track__cell',
                      bid != null ? 'is-set' : '',
                      waiting ? 'is-active' : '',
                      seat === 0 || seat === 2 ? 'is-partner' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="spades-bid-track__name">{state.players[seat].name}</span>
                    <span className="spades-bid-track__val">{label}</span>
                  </div>
                )
              })}
            </div>
          )}
          {statusText && (
            <p
              className={[
                'spades-status',
                yourTurn || humanBidTurn ? 'spades-status--turn' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="status"
            >
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
          />
        </div>
      </div>

      {humanBidTurn && (
        <div className="spades-bid-stage">
          <SpadesBidPanel
            key={state.handNumber}
            nilAllowed={state.rules.nilBids}
            blindNilAllowed={state.rules.blindNil}
            partnerName={state.players[2].name}
            onSubmit={onSubmitBid}
          />
        </div>
      )}

      <footer
        className={`table-hand ${yourTurn || humanBidTurn ? 'table-hand--your-turn' : ''}`}
        data-seat-anchor="0"
      >
        <Hand
          cards={state.players[0].hand}
          legalIds={yourTurn ? legalIds : undefined}
          interactive={yourTurn && !flight}
          yourTurn={yourTurn || humanBidTurn}
          flyingIds={inFlightIds}
          onCardClick={handleHandClick}
        />
      </footer>

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

      <Toast message={state.warning} tone="warn" />
      <SpadesScoreboard state={state} open={showScores} onClose={() => setShowScores(false)} />
      <LastTrickModal
        open={showLast}
        trick={state.lastTrick}
        playerNames={playerNames}
        resolveWinner={resolveWinner}
        onClose={() => setShowLast(false)}
      />
      <AchievementToast
        achievement={achievementToast ?? null}
        onDone={() => onAchievementDone?.()}
      />
      <SpadesOverlay
        state={state}
        onNextHand={onNextHand}
        onShowMatchResults={onShowMatchResults}
        onNewGame={onNewGame}
        onHome={onHome}
        onReviewLastTrick={() => setShowLast(true)}
      />
      <TableMenu
        open={showMenu}
        gameLabel="Spades"
        gameIcon="♠"
        onClose={() => setShowMenu(false)}
        onSettings={onSettings}
        onHome={onHome}
        onStartOver={onStartOver}
        onAbandon={onAbandon}
      />
    </div>
  )
}
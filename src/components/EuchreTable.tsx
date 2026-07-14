import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EuchreState } from '../games/euchre/engine'
import { teamLabel } from '../games/euchre/labels'
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
import { EuchreScoreboard } from './EuchreScoreboard'
import { EuchreOverlay } from './EuchreOverlay'
import { LastTrickModal } from './LastTrickModal'
import { CoachTips } from './CoachTips'
import { Toast } from './Toast'
import { hasSeenCoach, EUCHRE_COACH_TIPS } from '../coach'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { fxDeal, fxPlayCard, fxTrickWin, fxYourTurn } from '../fx'
import './Table.css'
import './Overlay.css'
import './EuchreTrumpPanel.css'

interface Props {
  state: EuchreState
  legal: Card[]
  feltStyle?: string
  hapticsEnabled?: boolean
  gameSpeed?: GameSpeed
  onCardClick: (card: import('../core/types').Card) => void
  onPass: () => void
  onOrderUp: () => void
  onNameTrump: (suit: import('../core/types').Suit) => void
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
}

export function EuchreTable({
  state,
  legal,
  feltStyle = 'green',
  hapticsEnabled = true,
  gameSpeed = 'fast',
  onCardClick,
  onPass,
  onOrderUp,
  onNameTrump,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onSettings,
  onStartOver,
  onAbandon,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showLast, setShowLast] = useState(false)
  const [coachOpen, setCoachOpen] = useState(() => !hasSeenCoach('euchre'))
  const [dealing, setDealing] = useState(false)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const pace = SPEED_TIMING[gameSpeed]
  const fxPrefs = useMemo(() => ({ hapticsEnabled }), [hapticsEnabled])
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const yourTurn = state.phase === 'playing' && state.whoseTurn === 0
  const yourBidTurn = state.phase === 'bidding' && state.whoseTurn === 0
  const yourDiscard = state.phase === 'discard' && state.whoseTurn === 0

  const seats = useMemo(
    () => seatViewsFromEuchre(state.players, state.trump),
    [state.players, state.trump],
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

  const handleHandClick = useCallback(
    (card: Card) => {
      fxPlayCard(fxPrefs)
      onCardClick(card)
    },
    [onCardClick, fxPrefs],
  )

  const showLastTrickOnTable =
    (state.phase === 'trick_reveal' || state.phase === 'hand_result') && state.lastTrick
  const trickPlays = showLastTrickOnTable ? state.lastTrick!.plays : state.currentTrick
  const trickReveal = state.phase === 'trick_reveal'

  const statusText =
    state.message ??
    (yourBidTurn
      ? 'Your bid'
      : yourDiscard
        ? 'Discard one card'
        : yourTurn
          ? 'Your turn'
          : state.whoseTurn != null
            ? `${state.players[state.whoseTurn].name}…`
            : null)

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
    >
      <TableHeader
        gameLabel="Euchre"
        gameIcon="♦"
        handNumber={state.handNumber}
        raceTo={state.rules.raceTo}
        metaExtra={state.trump ? `Trump ${trumpLabel}` : 'Bidding'}
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
          <div className="spades-hud" aria-label="Team scores">
            <span>
              {teamLabel('ns')} {state.teamScores.ns}
            </span>
            <span>
              {teamLabel('ew')} {state.teamScores.ew}
            </span>
          </div>
        </div>
      </div>

      {(yourBidTurn || yourDiscard) && (
        <div className="euchre-bid-stage">
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
          onCardClick={handleHandClick}
        />
      </footer>

      <Toast message={state.warning} tone="warn" />
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
        onClose={() => setShowLast(false)}
      />
      <EuchreOverlay
        state={state}
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
import { useEffect, useState } from 'react'
import type { EuchreState } from '../games/euchre/engine'
import { teamLabel, YOUR_TEAM } from '../games/euchre/labels'
import { Confetti } from './Confetti'
import './Overlay.css'

interface Props {
  state: EuchreState
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onReviewLastTrick?: () => void
}

const HAND_RESULT_DELAY_MS = 1200

export function EuchreOverlay({
  state,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onReviewLastTrick,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (state.phase !== 'hand_result' && state.phase !== 'game_over') {
      setVisible(false)
      return
    }
    if (state.phase === 'game_over') {
      setVisible(true)
      return
    }
    setVisible(false)
    const t = window.setTimeout(() => setVisible(true), HAND_RESULT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [state.phase, state.handNumber])

  if (state.phase !== 'hand_result' && state.phase !== 'game_over') return null
  if (!visible) return null

  const gameOver = state.phase === 'game_over'
  const matchEndingHand = state.phase === 'hand_result' && state.matchComplete
  const youWon = gameOver && state.winner === YOUR_TEAM
  const summary = state.lastHandSummary

  const handOutcome = summary
    ? summary.marched
      ? 'March (+2)'
      : summary.euchred
        ? 'Euchre (+2 defenders)'
        : '+1'
    : null

  return (
    <div
      className={[
        'overlay',
        'overlay--euchre',
        gameOver ? 'overlay--game-over' : '',
        youWon ? 'overlay--you-win' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {gameOver && youWon && <Confetti variant="win" count={80} intensity="normal" />}

      <div className="overlay__card">
        {gameOver ? (
          <>
            <div className={`overlay__badge ${youWon ? 'overlay__badge--win' : ''}`}>
              {youWon ? 'Your team wins!' : 'Match over'}
            </div>
            <h2 className="overlay__title">
              {state.winner != null ? teamLabel(state.winner) : 'Match'} takes the match
            </h2>
            <div className="overlay__scores overlay__scores--teams">
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ns')}</span>
                <strong>{state.teamScores.ns}</strong>
              </div>
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ew')}</span>
                <strong>{state.teamScores.ew}</strong>
              </div>
            </div>
            <div className="overlay__actions">
              <button type="button" className="btn btn--primary btn--lg" onClick={onNewGame}>
                New match
              </button>
              <button type="button" className="btn btn--ghost btn--lg" onClick={onHome}>
                Home
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="overlay__badge">Hand complete</div>
            <h2 className="overlay__title">{state.message ?? `Hand ${state.handNumber}`}</h2>
            {summary && (
              <p className="overlay__message">
                {teamLabel(summary.makerTeam)} took {summary.makerTricks} tricks · {handOutcome}
              </p>
            )}
            <div className="overlay__scores overlay__scores--teams">
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ns')}</span>
                <strong>
                  {summary?.matchTotals.ns ?? state.teamScores.ns}
                  {summary && summary.points.ns > 0 && (
                    <span className="overlay__delta"> +{summary.points.ns}</span>
                  )}
                </strong>
              </div>
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ew')}</span>
                <strong>
                  {summary?.matchTotals.ew ?? state.teamScores.ew}
                  {summary && summary.points.ew > 0 && (
                    <span className="overlay__delta"> +{summary.points.ew}</span>
                  )}
                </strong>
              </div>
            </div>
            <div className="overlay__actions">
              {matchEndingHand ? (
                <button type="button" className="btn btn--primary" onClick={onShowMatchResults}>
                  Final standings
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={onNextHand}>
                  Next hand
                </button>
              )}
              {onReviewLastTrick && state.lastTrick && (
                <button type="button" className="btn btn--ghost" onClick={onReviewLastTrick}>
                  Last trick
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={onHome}>
                Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
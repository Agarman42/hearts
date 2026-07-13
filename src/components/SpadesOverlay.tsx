import type { SpadesState } from '../games/spades/engine'
import { humorSpadesHandDone, humorSpadesMatchEnd } from '../humor'
import { Confetti } from './Confetti'
import './Overlay.css'

interface Props {
  state: SpadesState
  humorMode?: boolean
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onReviewLastTrick?: () => void
}

export function SpadesOverlay({
  state,
  humorMode = false,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onReviewLastTrick,
}: Props) {
  if (state.phase !== 'hand_result' && state.phase !== 'game_over') return null

  const gameOver = state.phase === 'game_over'
  const matchEndingHand = state.phase === 'hand_result' && state.matchComplete
  const yourTeam = 'ns'
  const youWon = gameOver && state.winner === yourTeam
  const handPts = state.handScores

  return (
    <div
      className={[
        'overlay',
        'overlay--spades',
        gameOver ? 'overlay--game-over' : '',
        youWon ? 'overlay--you-win' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {gameOver && youWon && <Confetti variant="win" count={100} intensity="epic" />}

      <div className="overlay__card">
        {gameOver ? (
          <>
            <div className={`overlay__badge ${youWon ? 'overlay__badge--win' : ''}`}>
              {youWon ? 'Your team wins!' : 'Match over'}
            </div>
            <h2 className="overlay__title">
              {humorMode
                ? humorSpadesMatchEnd(youWon)
                : `${state.winner === 'ns' ? 'North / South' : 'East / West'} takes the match`}
            </h2>
            <div className="overlay__scores overlay__scores--teams">
              <div className="overlay__team-score">
                <span className="overlay__team-label">North / South</span>
                <strong>{state.teamScores.ns}</strong>
              </div>
              <div className="overlay__team-score">
                <span className="overlay__team-label">East / West</span>
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
            <h2 className="overlay__title">Hand {state.handNumber} results</h2>
            {handPts && (
              <div className="overlay__scores overlay__scores--teams">
                <div className="overlay__team-score">
                  <span className="overlay__team-label">North / South</span>
                  <strong>
                    {handPts.ns >= 0 ? '+' : ''}
                    {handPts.ns}
                  </strong>
                </div>
                <div className="overlay__team-score">
                  <span className="overlay__team-label">East / West</span>
                  <strong>
                    {handPts.ew >= 0 ? '+' : ''}
                    {handPts.ew}
                  </strong>
                </div>
              </div>
            )}
            <p className="overlay__message">
              {humorMode ? humorSpadesHandDone() : state.message}
            </p>
            <div className="overlay__actions">
              {matchEndingHand ? (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={onShowMatchResults}
                >
                  Final standings
                </button>
              ) : (
                <button type="button" className="btn btn--primary btn--lg" onClick={onNextHand}>
                  Next hand
                </button>
              )}
              {onReviewLastTrick && state.lastTrick && (
                <button type="button" className="btn btn--ghost" onClick={onReviewLastTrick}>
                  Review last trick
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
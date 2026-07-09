import { Seat } from '../core/types'
import { HeartsState } from '../games/hearts/engine'
import { Avatar } from './Avatar'
import './Overlay.css'

interface Props {
  state: HeartsState
  onNextHand: () => void
  onNewGame: () => void
  onHome: () => void
}

export function Overlay({ state, onNextHand, onNewGame, onHome }: Props) {
  if (state.phase !== 'hand_result' && state.phase !== 'game_over') return null

  const seats: Seat[] = [0, 1, 2, 3]
  const sorted = [...seats].sort(
    (a, b) => state.players[a].totalScore - state.players[b].totalScore,
  )

  return (
    <div className="overlay">
      <div className="overlay__card">
        {state.phase === 'game_over' ? (
          <>
            <div className="overlay__badge">Match over</div>
            <h2 className="overlay__title">
              {state.winner != null ? (
                <span className="overlay__winner-line">
                  <Avatar
                    characterId={state.players[state.winner].characterId}
                    size="md"
                    active
                  />
                  {state.players[state.winner].name} wins!
                </span>
              ) : (
                'Game over'
              )}
            </h2>
            <p className="overlay__sub">
              First to {state.rules.raceTo} — lowest score takes it.
            </p>
          </>
        ) : (
          <>
            <div className="overlay__badge">Hand {state.handNumber}</div>
            <h2 className="overlay__title">
              {state.moonShooter != null
                ? `🌙 ${state.players[state.moonShooter].name} shot the moon!`
                : 'Hand complete'}
            </h2>
            <p className="overlay__sub">Points taken this hand</p>
          </>
        )}

        <div className="score-list">
          {sorted.map((seat, i) => {
            const p = state.players[seat]
            const handPts = state.handScores?.[seat] ?? p.handPoints
            return (
              <div
                key={seat}
                className={`score-list__row ${i === 0 ? 'score-list__row--lead' : ''}`}
              >
                <span className="score-list__rank">#{i + 1}</span>
                <Avatar characterId={p.characterId} size="sm" />
                <span className="score-list__name">{p.name}</span>
                {state.phase === 'hand_result' && (
                  <span className="score-list__delta">+{handPts}</span>
                )}
                <span className="score-list__total">{p.totalScore}</span>
              </div>
            )
          })}
        </div>

        <div className="overlay__actions">
          {state.phase === 'hand_result' ? (
            <button
              type="button"
              className="btn btn--primary btn--xl"
              onClick={onNextHand}
            >
              Next hand
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--xl"
              onClick={onNewGame}
            >
              Play again
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--xl" onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  )
}

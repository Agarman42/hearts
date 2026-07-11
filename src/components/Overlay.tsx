import { Seat } from '../core/types'
import { HeartsState } from '../games/hearts/engine'
import { Avatar } from './Avatar'
import { Confetti } from './Confetti'
import './Overlay.css'

interface Props {
  state: HeartsState
  onNextHand: () => void
  onNewGame: () => void
  onHome: () => void
  humorMode?: boolean
  humorLine?: string | null
}

export function Overlay({
  state,
  onNextHand,
  onNewGame,
  onHome,
  humorLine,
}: Props) {
  if (state.phase !== 'hand_result' && state.phase !== 'game_over') return null

  const seats: Seat[] = [0, 1, 2, 3]
  const sorted = [...seats].sort(
    (a, b) => state.players[a].totalScore - state.players[b].totalScore,
  )

  const moon = state.moonShooter != null
  const gameOver = state.phase === 'game_over'
  const youWon = gameOver && state.winner === 0
  const winner = state.winner != null ? state.players[state.winner] : null
  const showConfetti = moon || youWon
  const epicCelebration = moon || youWon

  return (
    <div
      className={[
        'overlay',
        moon ? 'overlay--moon' : '',
        gameOver ? 'overlay--game-over' : '',
        youWon ? 'overlay--you-win' : '',
        epicCelebration ? 'overlay--celebrate' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {epicCelebration && (
        <div
          className={`overlay__flash ${moon ? 'overlay__flash--moon' : 'overlay__flash--win'}`}
          aria-hidden
        />
      )}
      {showConfetti && (
        <Confetti
          variant={moon ? 'moon' : youWon ? 'win' : 'party'}
          count={moon ? 100 : youWon ? 120 : 64}
          intensity="epic"
        />
      )}

      <div className="overlay__card">
        {gameOver ? (
          <>
            <div className={`overlay__badge ${youWon ? 'overlay__badge--win' : ''}`}>
              {youWon ? 'You win the match' : 'Match over'}
            </div>
            <h2 className="overlay__title">
              {winner ? (
                <span className="overlay__winner-line">
                  <Avatar characterId={winner.characterId} size="lg" active />
                  <span className="overlay__winner-text">
                    <span className="overlay__winner-name">{winner.name}</span>
                    <span className="overlay__winner-sub">wins the table</span>
                  </span>
                </span>
              ) : (
                'Game over'
              )}
            </h2>
            <p className="overlay__sub">
              First to {state.rules.raceTo} — lowest score takes it.
              {humorLine ? ` ${humorLine}` : ''}
            </p>
          </>
        ) : (
          <>
            <div className={`overlay__badge ${moon ? 'overlay__badge--moon' : ''}`}>
              {moon ? 'Moon shot' : `Hand ${state.handNumber}`}
            </div>
            <h2 className="overlay__title">
              {moon ? (
                <span className="overlay__moon-line">
                  <span className="overlay__moon-icon" aria-hidden>
                    🌙
                  </span>
                  <span>
                    {state.players[state.moonShooter!].name}
                    <span className="overlay__moon-sub"> shot the moon!</span>
                  </span>
                </span>
              ) : (
                'Hand complete'
              )}
            </h2>
            <p className="overlay__sub">
              {moon
                ? 'All 26 points dumped on everyone else. Absolute chaos.'
                : 'Points this hand · running totals'}
              {humorLine ? ` ${humorLine}` : ''}
            </p>
          </>
        )}

        <div className="score-list">
          <div className="score-list__head" aria-hidden>
            <span />
            <span />
            <span />
            {state.phase === 'hand_result' && (
              <span className="score-list__head-delta">Hand</span>
            )}
            <span className="score-list__head-total">Total</span>
          </div>
          {sorted.map((seat, i) => {
            const p = state.players[seat]
            const handPts = state.handScores?.[seat] ?? p.handPoints
            const isWinner = gameOver && seat === state.winner
            const isMoon = moon && seat === state.moonShooter
            return (
              <div
                key={seat}
                className={[
                  'score-list__row',
                  i === 0 ? 'score-list__row--lead' : '',
                  isWinner ? 'score-list__row--winner' : '',
                  isMoon ? 'score-list__row--moon' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="score-list__rank">#{i + 1}</span>
                <Avatar characterId={p.characterId} size="md" active={isWinner || isMoon} />
                <span className="score-list__name">
                  {p.name}
                  {seat === 0 ? <span className="score-list__you"> you</span> : null}
                </span>
                {state.phase === 'hand_result' && (
                  <span
                    className={`score-list__delta ${
                      handPts === 0 ? 'is-zero' : handPts >= 13 ? 'is-heavy' : ''
                    }`}
                  >
                    +{handPts}
                  </span>
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

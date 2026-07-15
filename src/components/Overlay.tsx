import { useEffect, useState } from 'react'
import { Seat } from '../core/types'
import { HeartsState } from '../games/hearts/engine'
import { humanWonHearts, isYourSeat, type PassPlayPrefs } from '../passAndPlay'
import { Avatar } from './Avatar'
import { Confetti } from './Confetti'
import './Overlay.css'

interface Props {
  state: HeartsState
  passPlay?: PassPlayPrefs
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onReviewLastTrick?: () => void
  humorMode?: boolean
  humorLine?: string | null
}

const HAND_RESULT_DELAY_MS = 520

export function Overlay({
  state,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onReviewLastTrick,
  humorLine,
  passPlay = { passAndPlay: false, humanSeats: { 0: true, 1: false, 2: false, 3: false } },
}: Props) {
  const [visible, setVisible] = useState(false)
  const [recapReady, setRecapReady] = useState(false)
  const passAndPlay = passPlay.passAndPlay

  useEffect(() => {
    if (state.phase !== 'hand_result' && state.phase !== 'game_over') {
      setVisible(false)
      return
    }
    if (state.phase === 'game_over') {
      setRecapReady(false)
      setVisible(true)
      return
    }
    setRecapReady(false)
    setVisible(false)
    const t = window.setTimeout(() => setVisible(true), HAND_RESULT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [state.phase, state.handNumber])

  if (state.phase !== 'hand_result' && state.phase !== 'game_over') return null
  if (!visible) return null

  const seats: Seat[] = [0, 1, 2, 3]
  const sorted = [...seats].sort(
    (a, b) => state.players[a].totalScore - state.players[b].totalScore,
  )

  const moon = state.moonShooter != null
  const gameOver = state.phase === 'game_over'
  const matchEndingHand = state.phase === 'hand_result' && state.matchComplete
  const youWon = gameOver && humanWonHearts(state.winner, passPlay)
  const winner = state.winner != null ? state.players[state.winner] : null
  const showConfetti = gameOver && (moon || youWon)
  const epicCelebration = showConfetti
  const showHandColumn = state.handScores != null

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
            <div
              className={`overlay__badge ${moon ? 'overlay__badge--moon' : ''} ${
                matchEndingHand ? 'overlay__badge--final' : ''
              }`}
            >
              {moon ? 'Moon shot' : matchEndingHand ? 'Final hand' : `Hand ${state.handNumber}`}
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
              ) : matchEndingHand ? (
                'Match-ending hand'
              ) : (
                'Hand complete'
              )}
            </h2>
            <p className="overlay__sub">
              {moon
                ? 'All 26 points dumped on everyone else. Absolute chaos.'
                : matchEndingHand
                  ? 'How the last hand played out — then final standings.'
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
            {showHandColumn && (
              <span className="score-list__head-delta">
                {gameOver ? 'Last hand' : 'Hand'}
              </span>
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
                  {isYourSeat(seat, passPlay) ? (
                    <span className="score-list__you"> you</span>
                  ) : null}
                </span>
                {showHandColumn && (
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
            passAndPlay && !recapReady ? (
              <button
                type="button"
                className="btn btn--primary btn--xl"
                onClick={() => setRecapReady(true)}
              >
                Ready to continue
              </button>
            ) : (
              <>
                {matchEndingHand ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--xl"
                    onClick={onShowMatchResults ?? onNextHand}
                  >
                    Final standings
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary btn--xl"
                    onClick={onNextHand}
                  >
                    Next hand
                  </button>
                )}
                {state.lastTrick && onReviewLastTrick && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--xl"
                    onClick={onReviewLastTrick}
                  >
                    Review last trick
                  </button>
                )}
              </>
            )
          ) : passAndPlay && !recapReady ? (
            <button
              type="button"
              className="btn btn--primary btn--xl"
              onClick={() => setRecapReady(true)}
            >
              Ready to continue
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
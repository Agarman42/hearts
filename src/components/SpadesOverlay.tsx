import { useEffect, useState } from 'react'
import type { Seat } from '../core/types'
import { partnershipOf, type PartnershipId } from '../core/partnership'
import type { SpadesState } from '../games/spades/engine'
import { teamLabel } from '../games/spades/labels'
import {
  formatBidLabel,
  formatPoints,
  playerHandResult,
  teamHandResult,
} from '../games/spades/scoring'
import { humorSpadesHandDone, humorSpadesMatchEnd } from '../humor'
import {
  humanPartnershipTeam,
  humanTeamWon,
  isYourSeat,
  type PassPlayPrefs,
} from '../passAndPlay'
import { Confetti } from './Confetti'
import './Overlay.css'
import './SpadesTable.css'

interface Props {
  state: SpadesState
  passPlay?: PassPlayPrefs
  humorMode?: boolean
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onReviewLastTrick?: () => void
}

const HAND_RESULT_DELAY_MS = 520

function TeamBreakdown({
  team,
  state,
  yourTeam,
}: {
  team: PartnershipId
  state: SpadesState
  yourTeam: PartnershipId
}) {
  const summary = state.lastHandSummary
  if (!summary) return null
  const detail = summary.teams[team]
  const label = teamLabel(team)
  const isYours = team === yourTeam
  const result = teamHandResult(team, summary)

  return (
    <div
      className={[
        'spades-hand-breakdown__team',
        isYours ? 'spades-hand-breakdown__team--yours' : '',
        result ? `spades-hand-breakdown__team--${result}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="spades-hand-breakdown__team-head">
        <div className="spades-hand-breakdown__team-title">
          <span className="spades-hand-breakdown__team-name">{label}</span>
          {result && (
            <span
              className={`spades-hand-breakdown__result spades-hand-breakdown__result--${result}`}
            >
              {result === 'made' ? 'Made' : 'Set'}
            </span>
          )}
        </div>
        <span className="spades-hand-breakdown__team-total">
          {formatPoints(detail.handTotal)} this hand
        </span>
      </div>
      <dl className="spades-hand-breakdown__lines">
        <div className="spades-hand-breakdown__line">
          <dt>Bid / tricks</dt>
          <dd
            className={
              result ? `spades-hand-breakdown__bid-tricks--${result}` : undefined
            }
          >
            {detail.teamBid} / {detail.tricksTaken}
          </dd>
        </div>
        <div className="spades-hand-breakdown__line">
          <dt>Contract</dt>
          <dd>{formatPoints(detail.contractPoints)}</dd>
        </div>
        {detail.bagsAdded > 0 && (
          <div className="spades-hand-breakdown__line">
            <dt>Bags</dt>
            <dd>+{detail.bagsAdded}</dd>
          </div>
        )}
        {detail.nilPoints !== 0 && (
          <div className="spades-hand-breakdown__line">
            <dt>Nil</dt>
            <dd>{formatPoints(detail.nilPoints)}</dd>
          </div>
        )}
        {detail.bagPenalty > 0 && (
          <div className="spades-hand-breakdown__line spades-hand-breakdown__line--penalty">
            <dt>Bag penalty</dt>
            <dd>−{detail.bagPenalty}</dd>
          </div>
        )}
        <div className="spades-hand-breakdown__line spades-hand-breakdown__line--bags">
          <dt>Match bags</dt>
          <dd className="spades-hand-breakdown__bags-total">
            {summary.bagsAfter[team]}
            <span className="spades-hand-breakdown__bags-cap">
              / {state.rules.bagsPerPenalty}
            </span>
          </dd>
        </div>
        <div className="spades-hand-breakdown__line spades-hand-breakdown__line--match">
          <dt>Match total</dt>
          <dd>{summary.matchTotals[team]}</dd>
        </div>
      </dl>
    </div>
  )
}

export function SpadesOverlay({
  state,
  passPlay = { passAndPlay: false, humanSeats: { 0: true, 1: false, 2: false, 3: false } },
  humorMode = false,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onReviewLastTrick,
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

  const gameOver = state.phase === 'game_over'
  const matchEndingHand = state.phase === 'hand_result' && state.matchComplete
  const yourTeam = humanPartnershipTeam(passPlay)
  const youWon = gameOver && humanTeamWon(state.winner, passPlay)
  const summary = state.lastHandSummary

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

      <div className="overlay__card overlay__card--spades-hand">
        {gameOver ? (
          <>
            <div className={`overlay__badge ${youWon ? 'overlay__badge--win' : ''}`}>
              {youWon ? 'Your team wins!' : 'Match over'}
            </div>
            <h2 className="overlay__title">
              {humorMode
                ? humorSpadesMatchEnd(youWon)
                : `${state.winner != null ? teamLabel(state.winner) : 'Match'} takes the match`}
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
            <h2 className="overlay__title">Hand {state.handNumber} breakdown</h2>

            {summary && (
              <>
                <div className="spades-hand-breakdown__players" aria-label="Player bids and tricks">
                  {([0, 1, 2, 3] as Seat[]).map((seat) => {
                    const p = state.players[seat]
                    const row = summary.players[seat]
                    const partner = partnershipOf(seat) === yourTeam
                    const playerResult = playerHandResult(row)
                    return (
                      <div
                        key={seat}
                        className={[
                          'spades-hand-breakdown__player',
                          partner ? 'spades-hand-breakdown__player--partner' : '',
                          isYourSeat(seat, passPlay)
                            ? 'spades-hand-breakdown__player--you'
                            : '',
                          playerResult
                            ? `spades-hand-breakdown__player--${playerResult}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="spades-hand-breakdown__player-name">
                          {p.name}
                          {isYourSeat(seat, passPlay) && (
                            <span className="spades-hand-breakdown__you">You</span>
                          )}
                        </span>
                        <span className="spades-hand-breakdown__player-bid">
                          {formatBidLabel(row.bid)}
                        </span>
                        <span className="spades-hand-breakdown__player-tricks">
                          {row.tricks} trick{row.tricks === 1 ? '' : 's'}
                        </span>
                        {row.nilResult && (
                          <span
                            className={[
                              'spades-hand-breakdown__nil',
                              row.nilResult.made
                                ? 'spades-hand-breakdown__nil--made'
                                : 'spades-hand-breakdown__nil--fail',
                            ].join(' ')}
                          >
                            {row.nilResult.made ? 'Nil made' : 'Nil failed'}{' '}
                            {formatPoints(row.nilResult.points)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="spades-hand-breakdown__teams">
                  <TeamBreakdown team="ns" state={state} yourTeam={yourTeam} />
                  <TeamBreakdown team="ew" state={state} yourTeam={yourTeam} />
                </div>
              </>
            )}

            {humorMode && (
              <p className="overlay__message overlay__message--compact">
                {humorSpadesHandDone()}
              </p>
            )}
            <div className="overlay__actions overlay__actions--spades-hand">
              {passAndPlay && !recapReady ? (
                <button
                  type="button"
                  className="btn btn--primary spades-overlay__action-primary"
                  onClick={() => setRecapReady(true)}
                >
                  Ready to continue
                </button>
              ) : (
                <>
                  {matchEndingHand ? (
                    <button
                      type="button"
                      className="btn btn--primary spades-overlay__action-primary"
                      onClick={onShowMatchResults}
                    >
                      Final standings
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary spades-overlay__action-primary"
                      onClick={onNextHand}
                    >
                      Next hand
                    </button>
                  )}
                  {onReviewLastTrick && state.lastTrick && (
                    <button
                      type="button"
                      className="btn btn--ghost spades-overlay__action-secondary"
                      onClick={onReviewLastTrick}
                    >
                      Last trick
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
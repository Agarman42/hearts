import { useEffect, useState } from 'react'
import type { Seat } from '../core/types'
import { partnershipOf } from '../core/partnership'
import type { EuchreState } from '../games/euchre/engine'
import { formatEuchreHandMessage, teamLabel } from '../games/euchre/labels'
import { partnershipScoreRows } from '../core/teamLabels'
import { displayMatchScore } from '../games/euchre/scoring'
import { humorEuchreMatchEnd } from '../humor'
import { matchWinTitle, partnershipNames } from '../teamNames'
import {
  humanTeamWon,
  isYourSeat,
  viewerPartnership,
  type PassPlayPrefs,
} from '../passAndPlay'
import { peekGoalTick } from '../goals'
import { buildShareText, euchreHandRecapLines, shareOrCopy } from '../shareScore'
import { Confetti } from './Confetti'
import './Overlay.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  passPlay?: PassPlayPrefs
  humorMode?: boolean
  /** Online: hide next-hand / rematch; server auto-advances recaps. */
  online?: boolean
  canRematch?: boolean
  viewerSeat?: Seat
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onReviewLastTrick?: () => void
  skipRecaps?: boolean
}

const HAND_RESULT_DELAY_MS = 520

export function EuchreOverlay({
  state,
  passPlay = { passAndPlay: false, humanSeats: { 0: true, 1: false, 2: false, 3: false } },
  humorMode = false,
  online = false,
  canRematch = false,
  viewerSeat,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onReviewLastTrick,
  skipRecaps = false,
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
  if (skipRecaps && state.phase === 'hand_result' && !state.matchComplete) return null
  if (!visible) return null

  const gameOver = state.phase === 'game_over'
  const matchEndingHand = state.phase === 'hand_result' && state.matchComplete
  const raceTo = state.rules.raceTo
  const yourTeam = viewerPartnership(passPlay, viewerSeat)
  const youWon = gameOver && humanTeamWon(state.winner, passPlay, viewerSeat)
  const summary = state.lastHandSummary

  const recapLines = summary
    ? euchreHandRecapLines({
        makers: teamLabel(summary.makerTeam, yourTeam),
        makerTricks: summary.makerTricks,
        euchred: summary.euchred,
        marched: summary.marched,
        loner: summary.loner,
      })
    : []
  const goalTick = peekGoalTick()

  return (
    <div
      className={[
        'overlay',
        'overlay--euchre',
        gameOver ? 'overlay--game-over' : '',
        youWon ? 'overlay--you-win' : '',
        !gameOver && !matchEndingHand ? 'overlay--hand-result' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {gameOver && youWon && <Confetti variant="win" count={80} intensity="normal" />}

      <div className="overlay__card">
        {gameOver ? (
          <>
            <div className="overlay__body">
            <div className={`overlay__badge ${youWon ? 'overlay__badge--win' : ''}`}>
              {youWon ? 'Your team wins!' : 'Match over'}
            </div>
            <h2 className="overlay__title">
              {humorMode
                ? humorEuchreMatchEnd(youWon)
                : matchWinTitle(state.players, state.winner)}
            </h2>
            <div className="overlay__scores overlay__scores--teams">
              {partnershipScoreRows(state.teamScores, yourTeam).map((row) => (
                <div key={row.id} className="overlay__team-score">
                  <span className="overlay__team-label">
                    {row.label} · {partnershipNames(state.players, row.id)}
                  </span>
                  <strong>{displayMatchScore(row.score, raceTo)}</strong>
                </div>
              ))}
            </div>
            </div>
            <div className="overlay__actions">
              {online ? (
                <>
                  {canRematch && (
                    <button type="button" className="btn btn--primary" onClick={onNewGame}>
                      Rematch
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost" onClick={onHome}>
                    Leave
                  </button>
                </>
              ) : passAndPlay && !recapReady ? (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={() => setRecapReady(true)}
                >
                  Ready to continue
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn--primary" onClick={onNewGame}>
                    Rematch
                  </button>
                </>
              )}
              {!online && (
                <button type="button" className="btn btn--ghost" onClick={onHome}>
                  Home
                </button>
              )}
              <div className="overlay__links">
                <button
                  type="button"
                  className="overlay__link"
                  onClick={() => {
                    void shareOrCopy(
                      buildShareText({
                        game: 'Euchre',
                        title: youWon ? 'We won!' : 'Match over',
                        lines: [
                          `Us ${displayMatchScore(state.teamScores[yourTeam], raceTo)}`,
                          `Them ${displayMatchScore(
                            state.teamScores[yourTeam === 'ns' ? 'ew' : 'ns'],
                            raceTo,
                          )}`,
                        ],
                      }),
                    )
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="overlay__body">
            <div className="overlay__badge">Hand complete</div>
            <h2 className="overlay__title">
              {summary
                ? formatEuchreHandMessage(summary, yourTeam)
                : (state.message ?? `Hand ${state.handNumber}`)}
            </h2>
            {goalTick && <p className="overlay__message overlay__message--compact">{goalTick}</p>}
            {summary && (
              <div className="euchre-hand-breakdown__players" aria-label="Tricks this hand">
                {([0, 1, 2, 3] as Seat[]).map((seat) => {
                  const p = state.players[seat]
                  const partner = partnershipOf(seat) === yourTeam
                  const sittingOut = state.sittingOut === seat
                  return (
                    <div
                      key={seat}
                      className={[
                        'euchre-hand-breakdown__player',
                        partner ? 'euchre-hand-breakdown__player--partner' : '',
                        isYourSeat(seat, passPlay, viewerSeat)
                          ? 'euchre-hand-breakdown__player--you'
                          : '',
                        sittingOut ? 'euchre-hand-breakdown__player--out' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="euchre-hand-breakdown__name">{p.name}</span>
                      <span className="euchre-hand-breakdown__tricks">
                        {sittingOut ? 'sat out' : p.tricksWon}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="overlay__scores overlay__scores--teams">
              {partnershipScoreRows(summary?.matchTotals ?? state.teamScores, yourTeam).map(
                (row) => (
                  <div key={row.id} className="overlay__team-score">
                    <span className="overlay__team-label">{row.label}</span>
                    <strong>
                      {displayMatchScore(row.score, raceTo)}
                      {summary && summary.points[row.id] > 0 && (
                        <span className="overlay__delta"> +{summary.points[row.id]}</span>
                      )}
                    </strong>
                  </div>
                ),
              )}
            </div>
            </div>
            <div className="overlay__actions">
              {online ? (
                <>
                  <p className="overlay__message overlay__message--compact" role="status">
                    {matchEndingHand ? 'Match over' : 'Next hand dealing…'}
                  </p>
                  {matchEndingHand && canRematch && (
                    <button type="button" className="btn btn--primary" onClick={onNewGame}>
                      Rematch
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost" onClick={onHome}>
                    Leave
                  </button>
                </>
              ) : passAndPlay && !recapReady ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setRecapReady(true)}
                >
                  Ready to continue
                </button>
              ) : matchEndingHand ? (
                <button type="button" className="btn btn--primary" onClick={onShowMatchResults}>
                  Final standings
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={onNextHand}>
                  Next hand
                </button>
              )}
              {!online && (
                <button type="button" className="btn btn--ghost" onClick={onHome}>
                  Home
                </button>
              )}
              <div className="overlay__links">
                {onReviewLastTrick && state.lastTrick && (
                  <button type="button" className="overlay__link" onClick={onReviewLastTrick}>
                    Last trick
                  </button>
                )}
                <button
                  type="button"
                  className="overlay__link"
                  onClick={() => {
                    void shareOrCopy(
                      buildShareText({
                        game: 'Euchre',
                        title: summary
                          ? formatEuchreHandMessage(summary, yourTeam)
                          : `Hand ${state.handNumber}`,
                        lines: recapLines,
                      }),
                    )
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
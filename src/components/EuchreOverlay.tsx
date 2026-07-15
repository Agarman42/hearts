import { useEffect, useState } from 'react'
import type { Seat } from '../core/types'
import { partnershipOf } from '../core/partnership'
import type { EuchreState } from '../games/euchre/engine'
import { teamLabel } from '../games/euchre/labels'
import { displayMatchScore } from '../games/euchre/scoring'
import { humorEuchreHandDone, humorEuchreMatchEnd } from '../humor'
import {
  humanPartnershipTeam,
  humanTeamWon,
  isYourSeat,
  type PassPlayPrefs,
} from '../passAndPlay'
import { Confetti } from './Confetti'
import './Overlay.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  passPlay?: PassPlayPrefs
  humorMode?: boolean
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onReviewLastTrick?: () => void
}

const HAND_RESULT_DELAY_MS = 520

export function EuchreOverlay({
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
  const raceTo = state.rules.raceTo
  const yourTeam = humanPartnershipTeam(passPlay)
  const youWon = gameOver && humanTeamWon(state.winner, passPlay)
  const summary = state.lastHandSummary

  const handOutcome = summary
    ? summary.euchred
      ? 'Euchre (+2 defenders)'
      : summary.marched
        ? summary.loner
          ? 'Loner march (+4)'
          : 'March (+2)'
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
              {humorMode
                ? humorEuchreMatchEnd(youWon)
                : `${state.winner != null ? teamLabel(state.winner) : 'Match'} takes the match`}
            </h2>
            <div className="overlay__scores overlay__scores--teams">
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ns')}</span>
                <strong>{displayMatchScore(state.teamScores.ns, raceTo)}</strong>
              </div>
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ew')}</span>
                <strong>{displayMatchScore(state.teamScores.ew, raceTo)}</strong>
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
              <>
                <p className="overlay__message">
                  {teamLabel(summary.makerTeam)} took {summary.makerTricks} tricks · {handOutcome}
                  {summary.loner ? ' · Loner' : ''}
                </p>
                <div className="euchre-hand-breakdown__players" aria-label="Tricks this hand">
                  {([0, 1, 2, 3] as Seat[]).map((seat) => {
                    const p = state.players[seat]
                    const partner = partnershipOf(seat) === yourTeam
                    const sittingOut = state.sittingOut === seat
                    const isMaker = state.maker === seat
                    return (
                      <div
                        key={seat}
                        className={[
                          'euchre-hand-breakdown__player',
                          partner ? 'euchre-hand-breakdown__player--partner' : '',
                          isYourSeat(seat, passPlay) ? 'euchre-hand-breakdown__player--you' : '',
                          sittingOut ? 'euchre-hand-breakdown__player--out' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="euchre-hand-breakdown__name">
                          {p.name}
                          {isYourSeat(seat, passPlay) ? ' (you)' : ''}
                        </span>
                        <span className="euchre-hand-breakdown__role">
                          {sittingOut ? 'Sat out' : isMaker ? 'Maker' : partner ? 'Partner' : 'Defender'}
                        </span>
                        <span className="euchre-hand-breakdown__tricks">
                          {p.tricksWon} trick{p.tricksWon === 1 ? '' : 's'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {humorMode && (
              <p className="overlay__message overlay__message--compact">{humorEuchreHandDone()}</p>
            )}
            <div className="overlay__scores overlay__scores--teams">
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ns')}</span>
                <strong>
                  {displayMatchScore(summary?.matchTotals.ns ?? state.teamScores.ns, raceTo)}
                  {summary && summary.points.ns > 0 && (
                    <span className="overlay__delta"> +{summary.points.ns}</span>
                  )}
                </strong>
              </div>
              <div className="overlay__team-score">
                <span className="overlay__team-label">{teamLabel('ew')}</span>
                <strong>
                  {displayMatchScore(summary?.matchTotals.ew ?? state.teamScores.ew, raceTo)}
                  {summary && summary.points.ew > 0 && (
                    <span className="overlay__delta"> +{summary.points.ew}</span>
                  )}
                </strong>
              </div>
            </div>
            <div className="overlay__actions">
              {passAndPlay && !recapReady ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setRecapReady(true)}
                >
                  Ready to continue
                </button>
              ) : (
                <>
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
                </>
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
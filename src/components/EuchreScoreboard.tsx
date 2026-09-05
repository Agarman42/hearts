import type { PartnershipId } from '../core/partnership'
import type { EuchreState } from '../games/euchre/engine'
import { partnershipScoreRows } from '../core/teamLabels'
import type { Seat } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import { sanitizeViewerYouLabel } from '../multiplayer/identity'
import { Avatar } from './Avatar'
import './Scoreboard.css'

interface Props {
  state: EuchreState
  open: boolean
  onClose: () => void
  yourTeam?: PartnershipId
  viewerSeat?: Seat
}

export function EuchreScoreboard({
  state,
  open,
  onClose,
  yourTeam = 'ns',
  viewerSeat = 0,
}: Props) {
  if (!open) return null

  const raceTo = state.rules.raceTo
  const trumpLabel = state.trump ? SUIT_SYMBOL[state.trump] : '—'
  const teams = partnershipScoreRows(state.teamScores, yourTeam)
  const names = sanitizeViewerYouLabel(
    {
      0: state.players[0].name,
      1: state.players[1].name,
      2: state.players[2].name,
      3: state.players[3].name,
    },
    viewerSeat,
  )

  return (
    <div className="scoreboard-backdrop" onClick={onClose} role="presentation">
      <div
        className="scoreboard scoreboard--euchre"
        role="dialog"
        aria-modal="true"
        aria-label="Match scores"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="scoreboard__header">
          <div>
            <p className="scoreboard__eyebrow">
              <span aria-hidden>♦</span> Match
            </p>
            <h2 className="scoreboard__title">Team scores</h2>
            <p className="scoreboard__sub">
              Hand {state.handNumber || 1} · race to {raceTo} · trump {trumpLabel}
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M7 7l10 10M17 7 7 17"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="scoreboard__list">
          {teams.map((team) => {
            const pct = Math.min(100, (team.score / Math.max(1, raceTo)) * 100)
            const isYours = team.id === yourTeam
            const isLead = team.score > teams.find((t) => t.id !== team.id)!.score
            const isMaker = state.makerTeam === team.id
            return (
              <div
                key={team.id}
                className={[
                  'scoreboard__row',
                  'scoreboard__row--team',
                  isLead ? 'scoreboard__row--lead' : '',
                  isYours ? 'scoreboard__row--yours' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="scoreboard__rank">{isYours ? '●' : '○'}</span>
                <div className="scoreboard__team-avatars" aria-hidden>
                  {team.seats.map((seat) => (
                    <Avatar
                      key={seat}
                      characterId={state.players[seat].characterId}
                      size="sm"
                    />
                  ))}
                </div>
                <div className="scoreboard__info">
                  <div className="scoreboard__name-line">
                    <span className="scoreboard__name">{team.label}</span>
                    {isYours && <span className="scoreboard__you">Your team</span>}
                    <span className="scoreboard__partners">
                      {names[team.seats[0]]} & {names[team.seats[1]]}
                    </span>
                    {isMaker && state.phase !== 'bidding' && (
                      <span className="scoreboard__you">Makers</span>
                    )}
                  </div>
                  <div className="scoreboard__bar" aria-hidden>
                    <div className="scoreboard__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="scoreboard__meta">
                    <span>{team.score} pts</span>
                  </div>
                </div>
                <span className="scoreboard__total">{team.score}</span>
              </div>
            )
          })}
        </div>

        <div className="scoreboard__hand-grid" aria-label="Tricks this hand">
          {([0, 1, 2, 3] as const).map((seat) => {
            const p = state.players[seat]
            const sittingOut = state.sittingOut === seat
            const isMaker = state.maker === seat
            const isDealer = state.dealer === seat
            return (
              <div
                key={seat}
                className={[
                  'scoreboard__hand-cell',
                  sittingOut ? 'scoreboard__hand-cell--muted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="scoreboard__hand-name">
                  {isDealer && 'D '}
                  {names[seat]}
                  {isMaker ? ' · maker' : ''}
                  {sittingOut ? ' · out' : ''}
                </span>
                <span className="scoreboard__hand-val">
                  {sittingOut ? '—' : `${p.tricksWon} tricks`}
                </span>
              </div>
            )
          })}
        </div>
        {state.loner && (
          <p className="scoreboard__sub scoreboard__sub--loner">Loner hand — partner sat out</p>
        )}
      </div>
    </div>
  )
}
import type { SpadesState } from '../games/spades/engine'
import { Avatar } from './Avatar'
import './Scoreboard.css'

interface Props {
  state: SpadesState
  open: boolean
  onClose: () => void
}

export function SpadesScoreboard({ state, open, onClose }: Props) {
  if (!open) return null

  const raceTo = state.rules.raceTo
  const teams = [
    {
      id: 'ns' as const,
      label: 'North / South',
      seats: [2, 0] as const,
      score: state.teamScores.ns,
      bags: state.teamBags.ns,
    },
    {
      id: 'ew' as const,
      label: 'East / West',
      seats: [1, 3] as const,
      score: state.teamScores.ew,
      bags: state.teamBags.ew,
    },
  ].sort((a, b) => b.score - a.score)

  return (
    <div className="scoreboard-backdrop" onClick={onClose} role="presentation">
      <div
        className="scoreboard scoreboard--spades"
        role="dialog"
        aria-modal="true"
        aria-label="Match scores"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="scoreboard__header">
          <div>
            <p className="scoreboard__eyebrow">
              <span aria-hidden>♠</span> Match
            </p>
            <h2 className="scoreboard__title">Team scores</h2>
            <p className="scoreboard__sub">
              Hand {state.handNumber || 1} · race to {raceTo} · highest wins
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
          {teams.map((team, i) => {
            const pct = Math.min(100, (team.score / Math.max(1, raceTo)) * 100)
            const yourTeam = team.id === 'ns'
            return (
              <div
                key={team.id}
                className={[
                  'scoreboard__row',
                  'scoreboard__row--team',
                  i === 0 ? 'scoreboard__row--lead' : '',
                  yourTeam ? 'scoreboard__row--yours' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="scoreboard__rank">#{i + 1}</span>
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
                    {yourTeam && <span className="scoreboard__you">Your team</span>}
                  </div>
                  <div className="scoreboard__bar" aria-hidden>
                    <div className="scoreboard__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="scoreboard__meta">
                    <span>{team.score} pts</span>
                    <span>·</span>
                    <span>{team.bags} bags</span>
                  </div>
                </div>
                <span className="scoreboard__total">{team.score}</span>
              </div>
            )
          })}
        </div>

        <div className="scoreboard__hand-grid" aria-label="Player bids this hand">
          {([0, 1, 2, 3] as const).map((seat) => {
            const p = state.players[seat]
            const bid = state.bids[seat]
            return (
              <div key={seat} className="scoreboard__hand-cell">
                <span className="scoreboard__hand-name">{p.name}</span>
                <span className="scoreboard__hand-val">
                  {bid
                    ? bid.blindNil
                      ? 'B∅'
                      : bid.nil
                        ? 'Nil'
                        : bid.bid
                    : '—'}{' '}
                  / {p.tricksWon}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
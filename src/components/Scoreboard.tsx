import { Seat } from '../core/types'
import { HeartsState } from '../games/hearts/engine'
import { Avatar } from './Avatar'
import './Scoreboard.css'

interface Props {
  state: HeartsState
  open: boolean
  onClose: () => void
}

export function Scoreboard({ state, open, onClose }: Props) {
  if (!open) return null

  const seats: Seat[] = [0, 1, 2, 3]
  const sorted = [...seats].sort(
    (a, b) => state.players[a].totalScore - state.players[b].totalScore,
  )
  const raceTo = state.rules.raceTo

  return (
    <div className="scoreboard-backdrop" onClick={onClose} role="presentation">
      <div
        className="scoreboard"
        role="dialog"
        aria-modal="true"
        aria-label="Match scores"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="scoreboard__header">
          <div>
            <p className="scoreboard__eyebrow">Match</p>
            <h2 className="scoreboard__title">Scores</h2>
            <p className="scoreboard__sub">
              Hand {state.handNumber || 1} · race to {raceTo} · lowest wins
            </p>
          </div>
          <button
            type="button"
            className="scoreboard__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="scoreboard__list">
          {sorted.map((seat, i) => {
            const p = state.players[seat]
            const lead = i === 0
            const pct = Math.min(100, (p.totalScore / Math.max(1, raceTo)) * 100)
            return (
              <div
                key={seat}
                className={`scoreboard__row ${lead ? 'scoreboard__row--lead' : ''}`}
              >
                <span className="scoreboard__rank">#{i + 1}</span>
                <Avatar characterId={p.characterId} size="md" active={lead} />
                <div className="scoreboard__info">
                  <div className="scoreboard__name-line">
                    <span className="scoreboard__name">{p.name}</span>
                    {p.isHuman && <span className="scoreboard__you">You</span>}
                    {p.hasQueen && (
                      <span className="scoreboard__q" title="Has Q♠">
                        ♠Q
                      </span>
                    )}
                  </div>
                  <div className="scoreboard__bar" aria-hidden>
                    <div
                      className="scoreboard__bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="scoreboard__hand">
                    This hand: ♥ {p.handHearts}
                    {p.hasQueen ? ' · Q♠' : ''}
                    {p.handPoints > 0 ? ` · ${p.handPoints} pts` : ''}
                  </div>
                </div>
                <span className="scoreboard__total">{p.totalScore}</span>
              </div>
            )
          })}
        </div>

        <button type="button" className="btn btn--primary btn--lg" onClick={onClose}>
          Back to table
        </button>
      </div>
    </div>
  )
}

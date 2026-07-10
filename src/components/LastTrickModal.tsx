import { HeartsPlayerState } from '../games/hearts/engine'
import { CompletedTrick } from '../games/types'
import { Seat } from '../core/types'
import { CardView } from './CardView'
import { Avatar } from './Avatar'
import './LastTrickModal.css'

interface Props {
  trick: CompletedTrick | null
  players: Record<Seat, HeartsPlayerState>
  open: boolean
  onClose: () => void
}

export function LastTrickModal({ trick, players, open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-label="Last trick"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <p className="modal__eyebrow">
              <span aria-hidden>♠</span> Review
            </p>
            <h2 className="modal__title">Last trick</h2>
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
        </div>
        {!trick ? (
          <div className="modal__empty">
            <div className="modal__empty-icon" aria-hidden>
              ♠
            </div>
            <p>No trick played yet this hand.</p>
            <span>Play a few cards and check back.</span>
          </div>
        ) : (
          <>
            <div className="modal__winner">
              <Avatar
                characterId={players[trick.winner].characterId}
                size="sm"
                active
              />
              <div>
                <span className="modal__winner-label">Won by</span>
                <strong>{players[trick.winner].name}</strong>
              </div>
              {trick.points > 0 ? (
                <span className="modal__pts">+{trick.points}</span>
              ) : (
                <span className="modal__pts modal__pts--clean">0</span>
              )}
            </div>
            <div className="last-trick-grid">
              {trick.plays.map((p) => (
                <div
                  key={p.card.id}
                  className={`last-trick-grid__item ${
                    p.seat === trick.winner ? 'last-trick-grid__item--winner' : ''
                  }`}
                >
                  <CardView
                    card={p.card}
                    size="slot"
                    winning={p.seat === trick.winner}
                  />
                  <span>{players[p.seat].name}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <button type="button" className="btn btn--primary btn--lg modal__done" onClick={onClose}>
          Back to table
        </button>
      </div>
    </div>
  )
}

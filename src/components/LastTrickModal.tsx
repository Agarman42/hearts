import { HeartsPlayerState } from '../games/hearts/engine'
import { CompletedTrick } from '../games/types'
import { Seat } from '../core/types'
import { CardView } from './CardView'
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
          <h2>Last trick</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>
        {!trick ? (
          <p className="modal__empty">No trick played yet this hand.</p>
        ) : (
          <>
            <p className="modal__sub">
              Won by <strong>{players[trick.winner].name}</strong>
              {trick.points > 0 ? ` · ${trick.points} pts` : ''}
            </p>
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
      </div>
    </div>
  )
}

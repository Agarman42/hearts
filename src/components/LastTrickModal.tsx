import { Seat } from '../core/types'
import { HeartsPlayerState } from '../games/hearts/engine'
import { CompletedTrick } from '../games/types'
import { TrickArea } from './TrickArea'
import './LastTrickModal.css'

interface Props {
  trick: CompletedTrick | null
  players: Record<Seat, HeartsPlayerState>
  open: boolean
  onClose: () => void
}

export function LastTrickModal({ trick, players, open, onClose }: Props) {
  if (!open) return null

  const playerNames = {
    0: players[0].name,
    1: players[1].name,
    2: players[2].name,
    3: players[3].name,
  } as Record<0 | 1 | 2 | 3, string>

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal last-trick-modal"
        role="dialog"
        aria-modal="true"
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

            <div className="last-trick-modal__stage">
              <TrickArea
                plays={trick.plays}
                playerNames={playerNames}
                reveal
                highlightWinner
                holdMs={99999}
              />
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
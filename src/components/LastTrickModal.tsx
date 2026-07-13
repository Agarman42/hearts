import { Seat } from '../core/types'
import { CompletedTrick } from '../games/types'
import type { TrickWinnerResolver } from '../core/trick'
import { trickWinner as heartsTrickWinner } from '../games/hearts/rules'
import { TrickArea } from './TrickArea'
import './LastTrickModal.css'

interface Props {
  trick: CompletedTrick | null
  playerNames: Record<Seat, string>
  open: boolean
  onClose: () => void
  resolveWinner?: TrickWinnerResolver
}

export function LastTrickModal({
  trick,
  playerNames,
  open,
  onClose,
  resolveWinner = heartsTrickWinner,
}: Props) {
  if (!open) return null

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
                <strong>{playerNames[trick.winner]}</strong>
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
                resolveWinner={resolveWinner}
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
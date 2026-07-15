import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  gameLabel: string
  gameIcon: string
  onClose: () => void
  onSettings: () => void
  onHome: () => void
  onStartOver: () => void
  onAbandon: () => void
}

type PendingQuit = 'abandon' | 'startOver'

export function TableMenu({
  open,
  gameLabel,
  gameIcon,
  onClose,
  onSettings,
  onHome,
  onStartOver,
  onAbandon,
}: Props) {
  const [pendingQuit, setPendingQuit] = useState<PendingQuit | null>(null)

  useEffect(() => {
    if (!open) setPendingQuit(null)
  }, [open])

  if (!open) return null

  const confirmCopy =
    pendingQuit === 'abandon'
      ? {
          title: 'Quit this match?',
          body: 'Progress for this game will be erased. Career stats and achievements stay.',
          confirm: 'Yes, quit match',
        }
      : pendingQuit === 'startOver'
        ? {
            title: 'Start over?',
            body: 'Deal a fresh match with the same settings. Current progress will be lost.',
            confirm: 'Yes, start over',
          }
        : null

  return (
    <div className="table-menu" role="dialog" aria-label="Game menu">
      <button
        type="button"
        className="table-menu__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="table-menu__card">
        {confirmCopy ? (
          <>
            <h2 className="table-menu__title">{confirmCopy.title}</h2>
            <p className="table-menu__sub">{confirmCopy.body}</p>
            <div className="table-menu__confirm-actions">
              <button
                type="button"
                className="btn btn--ghost btn--lg"
                onClick={() => setPendingQuit(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--lg table-menu__danger"
                onClick={() => {
                  setPendingQuit(null)
                  onClose()
                  if (pendingQuit === 'abandon') onAbandon()
                  else onStartOver()
                }}
              >
                {confirmCopy.confirm}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="table-menu__header">
              <div>
                <p className="table-menu__eyebrow">
                  <span aria-hidden>{gameIcon}</span> {gameLabel}
                </p>
                <h2 className="table-menu__title">Menu</h2>
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
            <p className="table-menu__sub">
              Progress saves automatically. Leave anytime and pick up where you left off.
            </p>
            <div className="table-menu__save-chip" aria-hidden>
              <span className="table-menu__save-dot" />
              Match autosaved
            </div>
            <button type="button" className="btn btn--primary btn--lg" onClick={onClose}>
              Keep playing
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg table-menu__row"
              onClick={() => {
                onClose()
                onSettings()
              }}
            >
              <span className="table-menu__row-icon" aria-hidden>
                ⚙
              </span>
              Settings
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg table-menu__row"
              onClick={() => {
                onClose()
                onHome()
              }}
            >
              <span className="table-menu__row-icon" aria-hidden>
                ⌂
              </span>
              Home · save progress
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg table-menu__row"
              onClick={() => setPendingQuit('startOver')}
            >
              <span className="table-menu__row-icon" aria-hidden>
                ↻
              </span>
              Start over
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg table-menu__danger"
              onClick={() => setPendingQuit('abandon')}
            >
              Quit match
            </button>
          </>
        )}
      </div>
    </div>
  )
}
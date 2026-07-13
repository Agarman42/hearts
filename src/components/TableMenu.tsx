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
  if (!open) return null

  return (
    <div className="table-menu" role="dialog" aria-label="Game menu">
      <button
        type="button"
        className="table-menu__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="table-menu__card">
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
          onClick={() => {
            onClose()
            onStartOver()
          }}
        >
          <span className="table-menu__row-icon" aria-hidden>
            ↻
          </span>
          Start over
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--lg table-menu__danger"
          onClick={() => {
            onClose()
            onAbandon()
          }}
        >
          Quit match
        </button>
      </div>
    </div>
  )
}
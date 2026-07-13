interface Props {
  gameLabel: string
  gameIcon?: string
  handNumber: number
  raceTo: number
  metaExtra?: string
  onOpenMenu: () => void
  onOpenScores: () => void
  onOpenLastTrick: () => void
  onSettings: () => void
}

export function TableHeader({
  gameLabel,
  gameIcon = '♥',
  handNumber,
  raceTo,
  metaExtra,
  onOpenMenu,
  onOpenScores,
  onOpenLastTrick,
  onSettings,
}: Props) {
  return (
    <header className="table-top">
      <button
        type="button"
        className="icon-btn"
        onClick={onOpenMenu}
        aria-label="Menu"
        title="Menu"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="table-top__center">
        <div className="table-top__brand">
          <span className="table-top__suit table-top__suit--l" aria-hidden>
            {gameIcon}
          </span>
          <h1 className="table-top__title">{gameLabel}</h1>
          <span className="table-top__suit table-top__suit--r" aria-hidden>
            {gameIcon}
          </span>
        </div>
        <div className="table-top__meta">
          Hand {handNumber || 1} · race to {raceTo}
          {metaExtra ? ` · ${metaExtra}` : ''}
        </div>
      </div>
      <div className="table-top__actions">
        <button
          type="button"
          className="icon-btn icon-btn--score"
          onClick={onOpenScores}
          aria-label="Scores"
          title="Scores"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect
              x="4.5"
              y="3.5"
              width="15"
              height="17"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M8 9h8M8 13h8M8 17h5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenLastTrick}
          aria-label="Last trick"
          title="Last trick"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect
              x="7"
              y="5"
              width="11"
              height="15"
              rx="1.8"
              stroke="currentColor"
              strokeWidth="1.6"
              opacity="0.45"
              transform="rotate(8 12.5 12.5)"
            />
            <rect
              x="5"
              y="4"
              width="11"
              height="15"
              rx="1.8"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M8 9.5h5M8 12.5h3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.75" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.48.8.82 1.51.91H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.09Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
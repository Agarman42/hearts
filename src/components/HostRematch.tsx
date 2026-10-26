interface Props {
  canRematch: boolean
  onRematch: () => void
  onLeave: () => void
  buttonClass?: string
}

/** Host starts the next match. Everyone else is told to wait. */
export function HostRematch({
  canRematch,
  onRematch,
  onLeave,
  buttonClass = 'btn btn--primary',
}: Props) {
  return (
    <>
      {canRematch ? (
        <button type="button" className={buttonClass} onClick={onRematch}>
          Rematch
        </button>
      ) : (
        <p className="overlay__wait" role="status">
          Waiting for the host to start a rematch.
        </p>
      )}
      <button type="button" className="btn btn--ghost" onClick={onLeave}>
        Leave
      </button>
    </>
  )
}

export function DailyShareNote({ show }: { show: boolean }) {
  if (!show) return null
  return <p className="overlay__share-note">Score and streak only.</p>
}

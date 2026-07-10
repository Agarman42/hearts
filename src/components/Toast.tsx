import './Toast.css'

interface Props {
  message: string | null
  tone?: 'warn' | 'info' | 'hearts' | 'queen'
}

export function Toast({ message, tone = 'warn' }: Props) {
  if (!message) return null
  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      <span className="toast__icon" aria-hidden>
        {tone === 'warn' && (
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path
              d="M12 8v5M12 16.5h.01"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M10.3 4.8 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.8a2 2 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {tone === 'hearts' && '♥'}
        {tone === 'queen' && '♠'}
        {tone === 'info' && 'i'}
      </span>
      <span className="toast__text">{message}</span>
    </div>
  )
}

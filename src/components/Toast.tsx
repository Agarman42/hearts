import './Toast.css'

interface Props {
  message: string | null
  tone?: 'warn' | 'info' | 'hearts' | 'queen'
}

export function Toast({ message, tone = 'warn' }: Props) {
  if (!message) return null
  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      {tone === 'warn' && <span className="toast__icon">!</span>}
      {tone === 'hearts' && <span className="toast__icon toast__icon--heart">♥</span>}
      {tone === 'queen' && <span className="toast__icon toast__icon--queen">♠</span>}
      <span>{message}</span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { Seat } from '../core/types'
import './ConnectionBanner.css'

export type ConnectionPaused = {
  name: string
  until: number
  seat?: Seat
}

interface Props {
  connected: boolean
  paused?: ConnectionPaused | null
  canReplace?: boolean
  onReplace?: () => void
}

export function ConnectionBanner({
  connected,
  paused = null,
  canReplace = false,
  onReplace,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [seenLive, setSeenLive] = useState(connected)
  useEffect(() => {
    if (connected) setSeenLive(true)
  }, [connected])

  useEffect(() => {
    if (!paused) return
    const tick = () => setNow(Date.now())
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [paused])

  if (!connected) {
    if (!seenLive) return null
    return (
      <div className="connection-banner" role="status">
        <span className="connection-banner__pulse" aria-hidden />
        <p className="connection-banner__text">Reconnecting to the table…</p>
      </div>
    )
  }

  if (!paused) return null

  const waiting = now < paused.until
  if (waiting) {
    const secs = Math.max(0, Math.ceil((paused.until - now) / 1000))
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
    return (
      <div className="connection-banner" role="status">
        <span className="connection-banner__pulse" aria-hidden />
        <p className="connection-banner__text">
          {paused.name} stepped away — {clock}
        </p>
      </div>
    )
  }

  return (
    <div className="connection-banner connection-banner--replace" role="status">
      <p className="connection-banner__text">{paused.name} left the table.</p>
      {canReplace && onReplace ? (
        <button type="button" className="connection-banner__action" onClick={onReplace}>
          Seat a bot for this hand
        </button>
      ) : (
        <p className="connection-banner__hint">Waiting for everyone to replace with AI…</p>
      )}
    </div>
  )
}

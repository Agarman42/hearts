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
  /** Set when reconnecting has stopped for good. */
  stopped?: string | null
}

export function TurnClockBanner({ until }: { until: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [until])
  const secs = Math.max(0, Math.ceil((until - now) / 1000))
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  return (
    <div
      className="connection-banner connection-banner--clock"
      role="timer"
      aria-label={`${secs} seconds left on this decision`}
    >
      <p className="connection-banner__text">Time left {clock}</p>
    </div>
  )
}

export function ConnectionBanner({
  connected,
  paused = null,
  canReplace = false,
  onReplace,
  stopped = null,
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

  if (stopped) {
    return (
      <div className="connection-banner" role="alert">
        <p className="connection-banner__text">{stopped}</p>
      </div>
    )
  }

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
          {paused.name} stepped away. Their seat is held for {clock}. They can come back and play.
          Until then the computer may take their turn.
        </p>
      </div>
    )
  }

  return (
    <div className="connection-banner connection-banner--replace" role="status">
      <p className="connection-banner__text">
        {paused.name} has been away too long. A computer can finish this hand. If they rejoin, they
        take the seat back.
      </p>
      {canReplace && onReplace ? (
        <button type="button" className="connection-banner__action" onClick={onReplace}>
          Seat a computer
        </button>
      ) : (
        <p className="connection-banner__hint">Waiting for the other players to seat a computer.</p>
      )}
    </div>
  )
}

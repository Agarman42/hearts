import { useEffect, useRef, useState } from 'react'
import type { Seat } from '../core/types'
import './ConnectionBanner.css'

export type ConnectionPaused = {
  name: string
  until: number
  seat?: Seat
}

interface Props {
  connected: boolean
  /** Hide the banner before a room code exists. */
  quiet?: boolean
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
  quiet = false,
  paused = null,
  canReplace = false,
  onReplace,
  stopped = null,
}: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [back, setBack] = useState(false)
  const seenLive = useRef(false)
  const wasDown = useRef(false)

  useEffect(() => {
    if (quiet) return
    if (!connected) {
      if (seenLive.current) wasDown.current = true
      setBack(false)
      return
    }
    const returning = wasDown.current
    seenLive.current = true
    if (!returning) return
    setBack(true)
    const timer = window.setTimeout(() => {
      wasDown.current = false
      setBack(false)
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [connected, quiet])

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

  if (quiet) return null

  if (!connected) {
    return (
      <div className="connection-banner" role="status">
        <span className="connection-banner__pulse" aria-hidden />
        <p className="connection-banner__text">
          {seenLive.current ? 'Reconnecting…' : 'Connecting…'}
        </p>
      </div>
    )
  }

  if (back) {
    return (
      <div className="connection-banner connection-banner--clock" role="status">
        <p className="connection-banner__text">Back at the table.</p>
      </div>
    )
  }

  if (!paused) return null

  const waiting = now < paused.until
  if (waiting) {
    const secs = Math.max(0, Math.ceil((paused.until - now) / 1000))
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
    return (
      <div className="connection-banner connection-banner--away" role="status">
        <p className="connection-banner__text">{paused.name} stepped away.</p>
        <span className="connection-banner__hold" role="timer">
          Seat held {clock}
        </span>
      </div>
    )
  }

  return (
    <div className="connection-banner connection-banner--replace" role="status">
      <p className="connection-banner__text">{paused.name} left.</p>
      {canReplace && onReplace ? (
        <button type="button" className="connection-banner__action" onClick={onReplace}>
          Seat a computer
        </button>
      ) : (
        <p className="connection-banner__hint">Waiting on the other players.</p>
      )}
    </div>
  )
}

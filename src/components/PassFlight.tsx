import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '../core/types'
import { CardView } from './CardView'
import './PassFlight.css'

export interface FlightRect {
  left: number
  top: number
  width: number
  height: number
}

interface Props {
  card: Card
  from: FlightRect
  to: FlightRect
  onDone: () => void
}

const DURATION_MS = 340

/** Animated card flying from hand → pass slot. */
export function PassFlight({ card, from, to, onDone }: Props) {
  const [go, setGo] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGo(true))
    const t = window.setTimeout(onDone, DURATION_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [onDone])

  const style: CSSProperties = go
    ? {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        opacity: 1,
        transform: 'rotate(0deg) scale(1)',
      }
    : {
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        opacity: 1,
        transform: 'rotate(-6deg) scale(1)',
      }

  return createPortal(
    <div className={`pass-flight ${go ? 'pass-flight--go' : ''}`} style={style}>
      <CardView
        card={card}
        size="slot"
        style={{ width: '100%', height: '100%' }}
      />
    </div>,
    document.body,
  )
}

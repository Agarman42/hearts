import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '../core/types'
import { CardView } from './CardView'
import './CardFlight.css'

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
  size?: 'hand' | 'trick' | 'slot'
  durationMs?: number
  onDone: () => void
}

/** Fixed table face size — must match .trick__play .card--trick */
export const TRICK_FACE = { width: 100, height: 141 } as const
export const TRICK_FACE_SM = { width: 88, height: 124 } as const

export function trickFaceSize(): { width: number; height: number } {
  if (typeof window !== 'undefined' && window.innerWidth <= 420) {
    return { ...TRICK_FACE_SM }
  }
  return { ...TRICK_FACE }
}

/**
 * Flight uses compositor translate+scale from hand size → fixed table size.
 * Destination is always the fixed TRICK_FACE so land matches settled cards.
 */
export function CardFlight({
  card,
  from,
  to,
  size = 'hand',
  durationMs = 360,
  onDone,
}: Props) {
  const [go, setGo] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const ms = reduceMotion ? 0 : durationMs

  // Slot flights land at tray size; play flights land at trick pile size
  const end =
    size === 'slot'
      ? {
          width: Math.max(40, to.width),
          height: Math.max(56, to.height),
        }
      : trickFaceSize()
  // Start from the real hand/seat rect
  const startW = Math.max(40, from.width)
  const startH = startW * (end.height / end.width)
  const startLeft = from.left + from.width / 2 - startW / 2
  const startTop = from.top + from.height / 2 - startH / 2

  // End position: prefer measured `to`, but force end size
  const endLeft = to.left + to.width / 2 - end.width / 2
  const endTop = to.top + to.height / 2 - end.height / 2

  const dx = endLeft - startLeft
  const dy = endTop - startTop
  const s = end.width / startW

  useLayoutEffect(() => {
    if (ms <= 0) {
      setGo(true)
      const t = window.setTimeout(() => onDoneRef.current(), 0)
      return () => window.clearTimeout(t)
    }
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGo(true))
    })
    const t = window.setTimeout(() => onDoneRef.current(), ms + 16)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(t)
    }
     
  }, [ms])

  const shellStyle: CSSProperties = {
    left: startLeft,
    top: startTop,
    width: startW,
    height: startH,
    transform: go
      ? `translate3d(${dx}px, ${dy}px, 0) scale(${s})`
      : 'translate3d(0, 0, 0) scale(1)',
    transitionDuration: `${ms}ms`,
  }

  // Face metrics match the START shell; scale() carries them to end size
  const faceStyle = {
    width: '100%',
    height: '100%',
    ['--card-w']: `${startW}px`,
    ['--card-h']: `${startH}px`,
    ['--rank-size']: `${Math.max(12, startW * 0.28)}px`,
    ['--suit-size']: `${Math.max(10, startW * 0.24)}px`,
    ['--pip-size']: `${Math.max(18, startW * 0.48)}px`,
    ['--corner-pad']: `${Math.max(3, startW * 0.05)}px`,
    ['--radius']: `${Math.max(7, startW * 0.09)}px`,
  } as CSSProperties

  return createPortal(
    <div className={`card-flight ${go ? 'card-flight--go' : ''}`} style={shellStyle}>
      <CardView card={card} size={size} style={faceStyle} />
    </div>,
    document.body,
  )
}

export function rectOf(el: HTMLElement): FlightRect {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

/** Destination rect for a seat — prefers live card face, else fixed-size anchor. */
export function trickSeatRect(
  felt: HTMLElement,
  seat: 0 | 1 | 2 | 3,
  cardId?: string,
): FlightRect {
  const faceSize = trickFaceSize()

  if (cardId) {
    const face = document.querySelector(
      `[data-trick-card="${cardId}"] .card`,
    ) as HTMLElement | null
    if (face) {
      const r = face.getBoundingClientRect()
      if (r.width > 8) {
        return {
          left: r.left + r.width / 2 - faceSize.width / 2,
          top: r.top + r.height / 2 - faceSize.height / 2,
          ...faceSize,
        }
      }
    }
  }

  const seatFace = document.querySelector(
    `[data-trick-seat="${seat}"] .card`,
  ) as HTMLElement | null
  if (seatFace) {
    const r = seatFace.getBoundingClientRect()
    if (r.width > 8) {
      return {
        left: r.left + r.width / 2 - faceSize.width / 2,
        top: r.top + r.height / 2 - faceSize.height / 2,
        ...faceSize,
      }
    }
  }

  const anchor = document.querySelector(
    `[data-trick-anchor="${seat}"]`,
  ) as HTMLElement | null
  if (anchor) {
    const r = anchor.getBoundingClientRect()
    if (r.width > 8) {
      return {
        left: r.left + r.width / 2 - faceSize.width / 2,
        top: r.top + r.height / 2 - faceSize.height / 2,
        ...faceSize,
      }
    }
  }

  // Felt-center fallback with fixed offsets (match CSS)
  const fr = felt.getBoundingClientRect()
  const cx = fr.left + fr.width / 2
  const cy = fr.top + fr.height / 2
  const narrow = window.innerWidth <= 420
  let ox = 0
  let oy = 0
  if (narrow) {
    ox = seat === 1 ? -92 : seat === 3 ? 92 : 0
    oy = seat === 2 ? -86 : seat === 0 ? 82 : 0
  } else {
    ox = seat === 1 ? -108 : seat === 3 ? 108 : 0
    oy = seat === 2 ? -100 : seat === 0 ? 96 : 0
  }
  // Name chip sits above the card inside the play stack
  const nameBias = 11
  return {
    left: cx + ox - faceSize.width / 2,
    top: cy + oy - faceSize.height / 2 + nameBias,
    ...faceSize,
  }
}

export function seatOriginRect(seat: 0 | 1 | 2 | 3): FlightRect | null {
  const el = document.querySelector(
    `[data-seat-anchor="${seat}"]`,
  ) as HTMLElement | null
  if (el) {
    const r = rectOf(el)
    const w = Math.max(48, Math.min(68, r.width * 0.9))
    const h = w * (141 / 100)
    return {
      left: r.left + r.width / 2 - w / 2,
      top: r.top + r.height / 2 - h / 2,
      width: w,
      height: h,
    }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = 56
  const h = w * 1.41
  if (seat === 0) return { left: vw / 2 - w / 2, top: vh - 110, width: w, height: h }
  if (seat === 1) return { left: 14, top: vh / 2 - h / 2, width: w, height: h }
  if (seat === 2) return { left: vw / 2 - w / 2, top: 88, width: w, height: h }
  return { left: vw - 70, top: vh / 2 - h / 2, width: w, height: h }
}

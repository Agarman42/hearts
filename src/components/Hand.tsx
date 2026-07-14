import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Card } from '../core/types'
import { CardView } from './CardView'
import './Hand.css'

interface Props {
  cards: Card[]
  selectedIds?: Set<string>
  legalIds?: Set<string>
  /** Glowing outline — e.g. kitty card just picked up in Euchre. */
  highlightIds?: Set<string>
  interactive?: boolean
  passMode?: boolean
  yourTurn?: boolean
  flyingIds?: Set<string>
  /** Face-down fan (e.g. Spades blind-nil bidding before peek). */
  concealed?: boolean
  /** Confirmed play / pass select */
  onCardClick?: (card: Card, el: HTMLElement) => void
}

type DragState = {
  cardId: string
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
}

/**
 * Large-face hand fan. Play: press a card, drag it, release —
 * above the hand zone → play; back in the hand zone → cancel.
 */
export function Hand({
  cards,
  legalIds,
  highlightIds,
  interactive,
  passMode,
  yourTurn,
  flyingIds,
  concealed = false,
  onCardClick,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const cardEls = useRef(new Map<string, HTMLElement>())
  const lastFireRef = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const [layout, setLayout] = useState({ cardW: 86, step: 28, cardH: 122 })
  const [pressedId, setPressedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return

    const measure = () => {
      const edgeSlack = 8
      const avail = Math.max(0, el.clientWidth - edgeSlack * 2)
      const n = Math.max(cards.length, 1)
      const empty = Math.max(0, 13 - n)

      /*
       * Bigger faces + wider peeks so rank/suit stay readable.
       * Full 13-card hand still fits; fewer cards open up more.
       */
      const basePeek = passMode ? 0.3 : 0.28
      const peekRatio = Math.min(
        passMode ? 0.55 : 0.52,
        basePeek + empty * 0.028,
      )

      // Prefer large cards (phone-first). Cap high so 5–7 card hands look chunky.
      const sizeCap = Math.min(118, 88 + empty * 2.8)
      const sizeFloor = 78
      const denom = 1 + peekRatio * Math.max(0, n - 1)
      let cardW = Math.min(sizeCap, Math.max(sizeFloor, avail / Math.max(denom, 1)))

      let step: number
      if (n === 1) {
        step = cardW
      } else {
        step = cardW * peekRatio
        const span = cardW + step * (n - 1)
        if (span < avail - 4) {
          // Use leftover width to separate cards (easier picks)
          step = Math.min(cardW * 0.78, (avail - cardW) / (n - 1))
        } else if (span > avail) {
          // Keep faces large: tighten step first, then shrink width only if needed
          step = Math.max(22, (avail - cardW) / (n - 1))
          const need = cardW + step * (n - 1)
          if (need > avail) {
            cardW = Math.max(sizeFloor - 6, avail - step * (n - 1))
            step = Math.max(20, (avail - cardW) / Math.max(1, n - 1))
          }
        }
      }

      const cardH = Math.round(cardW * 1.42)
      setLayout({
        cardW: Math.round(cardW * 10) / 10,
        step: Math.round(step * 10) / 10,
        cardH,
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [cards.length, passMode])

  const n = cards.length
  const fanWidth =
    n === 0 ? 0 : layout.cardW + Math.max(0, n - 1) * layout.step

  const archPx = n <= 1 ? 0 : Math.min(22, 8 + n * 0.9)
  const maxRotate = Math.min(12, 5 + n * 0.45)
  const fanHeight = layout.cardH + 16 + archPx

  const isPlayable = useCallback(
    (card: Card) => {
      if (flyingIds?.has(card.id)) return false
      if (passMode) return true
      if (legalIds != null && legalIds.size > 0 && !legalIds.has(card.id)) {
        return false
      }
      return true
    },
    [flyingIds, legalIds, passMode],
  )

  const fireCard = useCallback(
    (card: Card) => {
      if (!interactive || !onCardClick) return
      const now = performance.now()
      if (now - lastFireRef.current < 220) return
      lastFireRef.current = now
      const el = cardEls.current.get(card.id)
      if (!el) return
      onCardClick(card, el)
    },
    [interactive, onCardClick],
  )

  const clearDrag = useCallback((pointerId?: number) => {
    const d = dragRef.current
    if (d && (pointerId == null || d.pointerId === pointerId)) {
      const slot = cardEls.current.get(d.cardId)
      try {
        slot?.releasePointerCapture(d.pointerId)
      } catch {
        /* ignore */
      }
      dragRef.current = null
      setDrag(null)
      setPressedId(null)
    }
  }, [])

  /** Release above this Y (client) → play. Default: top of hand rail. */
  const playLineY = useCallback(() => {
    const hand = handRef.current
    if (!hand) return window.innerHeight * 0.68
    const r = hand.getBoundingClientRect()
    // Mid-hand line — small upward drag still counts as play intent
    return r.top + r.height * 0.35
  }, [])

  const onSlotPointerDown = useCallback(
    (card: Card, e: ReactPointerEvent<HTMLElement>) => {
      if (!interactive || !onCardClick) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!isPlayable(card)) return
      if (flyingIds?.has(card.id)) return

      // Pass mode: tap only
      if (passMode) {
        e.preventDefault()
        e.stopPropagation()
        fireCard(card)
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const next: DragState = {
        cardId: card.id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
      }
      dragRef.current = next
      setDrag(next)
      setPressedId(card.id)

      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    [interactive, onCardClick, isPlayable, flyingIds, passMode, fireCard],
  )

  const onSlotPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      // Keep drag following finger — preventDefault stops scroll steal
      e.preventDefault()
      const next = { ...d, x: e.clientX, y: e.clientY }
      dragRef.current = next
      setDrag(next)
    },
    [],
  )

  const onSlotPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return

      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      const dist = Math.hypot(dx, dy)
      const up = -dy
      const line = playLineY()
      const releaseY = e.clientY

      /*
       * Simple mobile rules:
       *  - Quick tap (almost no move) → play
       *  - Release above the hand “play line” → play
       *  - Dragged up enough (≥ 36px) → play
       *  - Otherwise → snap back (cancel)
       */
      const isTap = dist < 18
      const aboveLine = releaseY < line
      const draggedUp = up >= 36
      const commit = isTap || aboveLine || draggedUp

      const card = cards.find((c) => c.id === d.cardId)
      clearDrag(e.pointerId)
      if (commit && card) fireCard(card)
    },
    [cards, clearDrag, fireCard, playLineY],
  )

  const onSlotPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      clearDrag(e.pointerId)
    },
    [clearDrag],
  )

  return (
    <div
      ref={handRef}
      className={[
        'hand',
        interactive && !concealed ? 'hand--interactive' : '',
        passMode ? 'hand--pass' : '',
        yourTurn && !concealed ? 'hand--your-turn' : '',
        concealed ? 'hand--concealed' : '',
        drag ? 'hand--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label="Your hand. Press a card, drag it up to play, or release in place to cancel."
    >
      <div className="hand__rail" ref={railRef}>
        <div
          className="hand__fan"
          style={{ width: fanWidth || '100%', height: fanHeight }}
        >
          {cards.map((card, i) => {
            const flying = flyingIds?.has(card.id) ?? false
            const isLegal = !legalIds || legalIds.has(card.id)
            const highlighted = highlightIds?.has(card.id) ?? false
            const dimmed =
              interactive &&
              !passMode &&
              legalIds != null &&
              legalIds.size > 0 &&
              !isLegal
            const t =
              n <= 1 ? 0 : (i - (n - 1) / 2) / Math.max((n - 1) / 2, 1)
            const rotate = t * maxRotate
            const lift = t * t * archPx
            const left = i * layout.step

            const isTop = i === n - 1
            // Wide hit face: almost full peek + a bit of body for easy grabs
            const hitW = isTop
              ? layout.cardW
              : Math.max(layout.step + 10, Math.min(layout.cardW * 0.55, 48))
            const hitH = isTop
              ? layout.cardH
              : Math.max(layout.cardH * 0.62, 64)

            const pressed = pressedId === card.id
            const dragging = drag?.cardId === card.id
            const dragTx = dragging && drag ? drag.x - drag.startX : 0
            const dragTy = dragging && drag ? drag.y - drag.startY : 0
            const commitHint =
              dragging && drag
                ? drag.y < playLineY() || drag.startY - drag.y >= 40
                : false

            return (
              <div
                key={card.id}
                className={[
                  'hand__slot',
                  dimmed ? 'hand__slot--dimmed' : '',
                  highlighted ? 'hand__slot--picked-up' : '',
                  pressed ? 'hand__slot--pressed' : '',
                  !dimmed && interactive ? 'hand__slot--live' : '',
                  dragging ? 'hand__slot--drag' : '',
                  commitHint ? 'hand__slot--commit' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="listitem"
                data-hand-card-id={card.id}
                ref={(node) => {
                  if (node) cardEls.current.set(card.id, node)
                  else cardEls.current.delete(card.id)
                }}
                style={{
                  left,
                  width: layout.cardW,
                  height: layout.cardH,
                  zIndex: dragging ? 50 : i + 1,
                  transform: dragging
                    ? `translate3d(${dragTx}px, ${dragTy}px, 0) translateY(${lift}px) rotate(${rotate * 0.2}deg) scale(1.08)`
                    : `translateY(${lift}px) rotate(${rotate}deg)`,
                  visibility: flying ? 'hidden' : 'visible',
                  pointerEvents: flying || dimmed ? 'none' : 'auto',
                  transition: dragging ? 'none' : undefined,
                }}
                onPointerDown={
                  interactive && !dimmed && !flying
                    ? (e) => onSlotPointerDown(card, e)
                    : undefined
                }
                onPointerMove={
                  interactive && !passMode ? onSlotPointerMove : undefined
                }
                onPointerUp={
                  interactive && !passMode ? onSlotPointerUp : undefined
                }
                onPointerCancel={
                  interactive && !passMode ? onSlotPointerCancel : undefined
                }
              >
                <CardView
                  card={card}
                  size="hand"
                  faceDown={concealed}
                  selected={false}
                  dimmed={dimmed}
                  style={
                    {
                      width: layout.cardW,
                      height: layout.cardH,
                      ['--card-w']: `${layout.cardW}px`,
                      ['--card-h']: `${layout.cardH}px`,
                      ['--rank-size']: `${Math.max(20, layout.cardW * 0.36)}px`,
                      ['--suit-size']: `${Math.max(16, layout.cardW * 0.3)}px`,
                      ['--pip-size']: `${Math.max(20, layout.cardW * 0.34)}px`,
                      ['--corner-pad']: `${Math.max(3, layout.cardW * 0.045)}px`,
                      pointerEvents: 'none',
                    } as CSSProperties
                  }
                />
                {/* Full-card grab surface for touch (sits under finger) */}
                <button
                  type="button"
                  className="hand__hit"
                  tabIndex={interactive && !dimmed && !flying ? 0 : -1}
                  disabled={!interactive || dimmed || flying}
                  aria-label={`${card.rank} of ${card.suit}${
                    dimmed ? ' (not legal)' : ''
                  }. Press and drag up to play.`}
                  style={{ width: hitW, height: hitH }}
                  onClick={(e) => {
                    // Keyboard activation only — touch uses pointer handlers on slot
                    if (e.detail === 0) {
                      e.stopPropagation()
                      if (!interactive || dimmed || flying) return
                      fireCard(card)
                    } else {
                      e.preventDefault()
                      e.stopPropagation()
                    }
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      {drag && !passMode && (
        <div
          className={`hand__flick-hint ${
            drag.y < playLineY() || drag.startY - drag.y >= 40
              ? 'hand__flick-hint--go'
              : ''
          }`}
          aria-hidden
        >
          {drag.y < playLineY() || drag.startY - drag.y >= 40
            ? 'Release to play'
            : 'Drag up · release to cancel'}
        </div>
      )}
    </div>
  )
}

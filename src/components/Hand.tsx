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
  interactive?: boolean
  passMode?: boolean
  yourTurn?: boolean
  flyingIds?: Set<string>
  /** Tap / keyboard / confirmed flick */
  onCardClick?: (card: Card, el: HTMLElement) => void
}

type DragState = {
  cardId: string
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  /** Max upward travel (negative dy) during this drag */
  peakUp: number
}

/**
 * Arched fan hand. Cards spread wider as the hand shrinks.
 * Play mode: drag/flick toward the table to play; release low to cancel.
 */
export function Hand({
  cards,
  legalIds,
  interactive,
  passMode,
  yourTurn,
  flyingIds,
  onCardClick,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const cardEls = useRef(new Map<string, HTMLElement>())
  const lastFireRef = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const [layout, setLayout] = useState({ cardW: 72, step: 18, cardH: 102 })
  const [pressedId, setPressedId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return

    const measure = () => {
      const edgeSlack = 12
      const avail = Math.max(0, el.clientWidth - edgeSlack * 2)
      const n = Math.max(cards.length, 1)

      /*
       * Spread more as the hand shrinks so late-hand picks are easy.
       * Full hand stays a tight corner-peek fan.
       */
      const empty = Math.max(0, 13 - n)
      const basePeek = passMode ? 0.26 : 0.2
      // Each missing card opens the fan a little (cap before full face gap)
      const peekRatio = Math.min(
        passMode ? 0.48 : 0.46,
        basePeek + empty * (passMode ? 0.022 : 0.024),
      )

      // Slightly larger faces when fewer cards
      const sizeCap = Math.min(102, 72 + empty * 2.2)
      const denom = 1 + peekRatio * Math.max(0, n - 1)
      let cardW = Math.min(sizeCap, Math.max(66, avail / Math.max(denom, 1)))

      const suitGapPx = n >= 8 ? 5 : n >= 5 ? 7 : 9
      const maxSuitGaps = 3
      const suitBudget = maxSuitGaps * suitGapPx

      let step: number
      if (n === 1) {
        step = cardW
      } else {
        // Ideal step from peek; if room left after empty seats, use it
        step = cardW * peekRatio
        const span = cardW + step * (n - 1) + suitBudget
        if (span < avail - 8 && n < 13) {
          // Expand into free width so cards separate more
          step = Math.min(
            cardW * 0.72,
            (avail - cardW - suitBudget) / (n - 1),
          )
        } else if (span > avail) {
          step = Math.max(14, (avail - cardW - suitBudget) / (n - 1))
          if (step < 14) {
            cardW = Math.max(58, avail - suitBudget - 14 * (n - 1))
            step = (avail - cardW - suitBudget) / Math.max(1, n - 1)
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
  const suitGapPx = n >= 8 ? 6 : n >= 5 ? 8 : 10
  const suitGaps =
    n <= 1
      ? 0
      : cards.reduce(
          (acc, c, i) =>
            acc + (i > 0 && cards[i - 1].suit !== c.suit ? suitGapPx : 0),
          0,
        )
  const fanWidth =
    n === 0 ? 0 : layout.cardW + Math.max(0, n - 1) * layout.step + suitGaps

  const archPx = n <= 1 ? 0 : Math.min(26, 10 + n * 1.05)
  const maxRotate = Math.min(14, 6 + n * 0.55)
  const fanHeight = layout.cardH + 18 + archPx

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

  const pickCardAtPoint = useCallback(
    (clientX: number, clientY: number): Card | null => {
      const stack = document.elementsFromPoint(clientX, clientY)
      for (const node of stack) {
        if (!(node instanceof Element)) continue
        const host = node.closest('[data-hand-card-id]') as HTMLElement | null
        if (!host) continue
        const id = host.getAttribute('data-hand-card-id')
        if (!id) continue
        const card = cards.find((c) => c.id === id)
        if (!card || !isPlayable(card)) continue
        return card
      }
      return null
    },
    [cards, isPlayable],
  )

  const fireCard = useCallback(
    (card: Card) => {
      if (!interactive || !onCardClick) return
      const now = performance.now()
      if (now - lastFireRef.current < 280) return
      lastFireRef.current = now
      const el = cardEls.current.get(card.id)
      if (!el) return
      setPressedId(card.id)
      window.setTimeout(
        () => setPressedId((id) => (id === card.id ? null : id)),
        160,
      )
      onCardClick(card, el)
    },
    [interactive, onCardClick],
  )

  const endDrag = useCallback(
    (commit: boolean) => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d) return
      try {
        railRef.current?.releasePointerCapture(d.pointerId)
      } catch {
        /* ignore */
      }
      if (!commit) return
      const card = cards.find((c) => c.id === d.cardId)
      if (card) fireCard(card)
    },
    [cards, fireCard],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive || !onCardClick) return
      if (e.pointerType === 'mouse' && e.button !== 0) return

      const card = pickCardAtPoint(e.clientX, e.clientY)
      if (!card) return

      // Pass mode: simple tap select (no flick)
      if (passMode) {
        e.preventDefault()
        fireCard(card)
        return
      }

      // Play mode: grab for possible flick
      e.preventDefault()
      e.stopPropagation()
      const next: DragState = {
        cardId: card.id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        peakUp: 0,
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
    [interactive, onCardClick, pickCardAtPoint, passMode, fireCard],
  )

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const dy = e.clientY - d.startY
    const peakUp = Math.min(d.peakUp, dy) // more negative = higher up
    const next = {
      ...d,
      x: e.clientX,
      y: e.clientY,
      peakUp,
    }
    dragRef.current = next
    setDrag(next)
  }, [])

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) {
        // Tap fallback when no drag started (shouldn't happen often)
        return
      }

      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      const dist = Math.hypot(dx, dy)
      const up = -dy // positive = flicked toward table
      const peakUp = -Math.min(d.peakUp, dy)

      /*
       * Commit if:
       *  - flicked/dragged upward enough (toward table), OR
       *  - quick flick with upward bias
       * Cancel if released still near the hand (pull back).
       */
      const commit =
        up > 56 ||
        peakUp > 72 ||
        (up > 28 && dist > 48) ||
        // short tap still plays (accessibility / quick play)
        (dist < 14 && up >= -10)

      // If they pulled it up then back down into the hand zone → cancel
      const pulledBack = peakUp > 40 && up < 24
      endDrag(commit && !pulledBack)
      setPressedId(null)
    },
    [endDrag],
  )

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      endDrag(false)
      setPressedId(null)
    },
    [endDrag],
  )

  return (
    <div
      className={[
        'hand',
        interactive ? 'hand--interactive' : '',
        passMode ? 'hand--pass' : '',
        yourTurn ? 'hand--your-turn' : '',
        drag ? 'hand--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label="Your hand. Drag a card up toward the table to play; pull back to cancel."
    >
      <div className="hand__rail" ref={railRef}>
        <div
          className="hand__fan"
          style={{ width: fanWidth || '100%', height: fanHeight }}
          onPointerDown={interactive ? onPointerDown : undefined}
          onPointerMove={interactive && !passMode ? onPointerMove : undefined}
          onPointerUp={interactive && !passMode ? onPointerUp : undefined}
          onPointerCancel={interactive && !passMode ? onPointerCancel : undefined}
        >
          {cards.map((card, i) => {
            const flying = flyingIds?.has(card.id) ?? false
            const isLegal = !legalIds || legalIds.has(card.id)
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
            const suitBreak =
              i > 0 && cards[i - 1].suit !== card.suit ? suitGapPx : 0
            const left =
              i * layout.step +
              cards
                .slice(0, i)
                .reduce(
                  (acc, _c, j) =>
                    acc +
                    (j > 0 && cards[j - 1].suit !== cards[j].suit
                      ? suitGapPx
                      : 0),
                  0,
                )

            const isTop = i === n - 1
            // Wider hit strips when spread is open
            const hitW = isTop
              ? layout.cardW
              : Math.max(layout.step + 6, Math.min(layout.cardW * 0.4, 36))
            const hitH = isTop
              ? layout.cardH
              : Math.max(layout.cardH * 0.48, 52)
            const pressed = pressedId === card.id
            const dragging = drag?.cardId === card.id
            const dragTx = dragging && drag ? drag.x - drag.startX : 0
            const dragTy = dragging && drag ? drag.y - drag.startY : 0
            const dragScale = dragging ? 1.06 : 1
            const commitHint =
              dragging && drag
                ? -Math.min(drag.peakUp, drag.y - drag.startY) > 48 ||
                  drag.startY - drag.y > 40
                : false

            return (
              <div
                key={card.id}
                className={[
                  'hand__slot',
                  dimmed ? 'hand__slot--dimmed' : '',
                  pressed ? 'hand__slot--pressed' : '',
                  !dimmed && interactive ? 'hand__slot--live' : '',
                  suitBreak > 0 ? 'hand__slot--suit-break' : '',
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
                  zIndex: dragging ? 40 : i + 1,
                  transform: dragging
                    ? `translate(${dragTx}px, ${dragTy}px) translateY(${lift}px) rotate(${rotate * 0.35}deg) scale(${dragScale})`
                    : `translateY(${lift}px) rotate(${rotate}deg)`,
                  visibility: flying ? 'hidden' : 'visible',
                  pointerEvents: flying ? 'none' : 'auto',
                  transition: dragging ? 'none' : undefined,
                }}
              >
                <CardView
                  card={card}
                  size="hand"
                  selected={false}
                  dimmed={dimmed}
                  style={
                    {
                      width: layout.cardW,
                      height: layout.cardH,
                      ['--card-w']: `${layout.cardW}px`,
                      ['--card-h']: `${layout.cardH}px`,
                      ['--rank-size']: `${Math.max(18, layout.cardW * 0.34)}px`,
                      ['--suit-size']: `${Math.max(15, layout.cardW * 0.28)}px`,
                      ['--pip-size']: `${Math.max(22, layout.cardW * 0.42)}px`,
                      ['--corner-pad']: `${Math.max(2, layout.cardW * 0.04)}px`,
                      pointerEvents: 'none',
                    } as CSSProperties
                  }
                />
                <button
                  type="button"
                  className="hand__hit"
                  tabIndex={interactive && !dimmed && !flying ? 0 : -1}
                  disabled={!interactive || dimmed || flying}
                  aria-label={`${card.rank} of ${card.suit}${
                    dimmed ? ' (not legal)' : ''
                  }. Drag up to play, pull back to cancel.`}
                  style={{ width: hitW, height: hitH }}
                  onClick={(e) => {
                    // Keyboard / accessibility activation only
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
        <div className="hand__flick-hint" aria-hidden>
          {(() => {
            const up = drag.startY - drag.y
            const peak = -drag.peakUp
            if (up > 48 || peak > 56) return 'Release to play'
            if (peak > 28 && up < 20) return 'Pull back to cancel'
            return 'Flick toward table'
          })()}
        </div>
      )}
    </div>
  )
}

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
  onCardClick?: (card: Card, el: HTMLElement) => void
}

/**
 * Tight arched fan: mostly top-left corners show (rank+suit), not the full
 * left edge. Card size is stable for a full hand so cards don't balloon as
 * you play them down.
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
  const [layout, setLayout] = useState({ cardW: 72, step: 18, cardH: 102 })
  const [pressedId, setPressedId] = useState<string | null>(null)

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return

    const measure = () => {
      const edgeSlack = 12
      const avail = Math.max(0, el.clientWidth - edgeSlack * 2)
      const n = Math.max(cards.length, 1)

      /*
       * Corner-peek fan: only ~21–26% of each card's width shows.
       * Size is computed as if holding a full 13-card hand so remaining
       * cards don't grow as the hand empties.
       */
      const peekRatio = passMode ? 0.26 : 0.21
      const fullHand = 13
      // cardW + peek*(fullHand-1) ≈ avail  →  cardW * (1 + peek*12) ≈ avail
      const denom = 1 + peekRatio * (fullHand - 1)
      // Slightly larger faces (~+10%) while still fitting a 13-card fan
      let cardW = Math.min(94, Math.max(68, avail / denom))

      // Suit gaps: small fixed hairlines, not big wedges
      const suitGapPx = 5
      const maxSuitGaps = 3
      const suitBudget = maxSuitGaps * suitGapPx

      let step: number
      if (n === 1) {
        step = cardW
      } else {
        step = cardW * peekRatio
        const span = cardW + step * (n - 1) + suitBudget
        if (span > avail) {
          // Prefer keeping size; tighten peek first
          step = Math.max(15, (avail - cardW - suitBudget) / (n - 1))
          if (step < 15) {
            cardW = Math.max(62, avail - suitBudget - 15 * (n - 1))
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
  // Fixed small suit break — not proportional to step (was eating width)
  const suitGapPx = 6
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

  // Held-card arch: outer cards dip, mild outward tilt
  const archPx = n <= 1 ? 0 : Math.min(26, 10 + n * 1.05)
  const maxRotate = Math.min(14, 6 + n * 0.55)
  const fanHeight = layout.cardH + 18 + archPx

  const pickCardAtPoint = useCallback(
    (clientX: number, clientY: number): Card | null => {
      const stack = document.elementsFromPoint(clientX, clientY)
      for (const node of stack) {
        if (!(node instanceof Element)) continue
        const host = node.closest('[data-hand-card-id]') as HTMLElement | null
        if (!host) continue
        const id = host.getAttribute('data-hand-card-id')
        if (!id) continue
        if (flyingIds?.has(id)) continue
        const card = cards.find((c) => c.id === id)
        if (!card) continue
        if (
          !passMode &&
          legalIds != null &&
          legalIds.size > 0 &&
          !legalIds.has(id)
        ) {
          continue
        }
        return card
      }
      return null
    },
    [cards, flyingIds, legalIds, passMode],
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

  const onFanPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive || !onCardClick) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const card = pickCardAtPoint(e.clientX, e.clientY)
      if (card) {
        e.preventDefault()
        e.stopPropagation()
        fireCard(card)
      }
    },
    [interactive, onCardClick, pickCardAtPoint, fireCard],
  )

  return (
    <div
      className={[
        'hand',
        interactive ? 'hand--interactive' : '',
        passMode ? 'hand--pass' : '',
        yourTurn ? 'hand--your-turn' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label="Your hand"
    >
      <div className="hand__rail" ref={railRef}>
        <div
          className="hand__fan"
          style={{ width: fanWidth || '100%', height: fanHeight }}
          onPointerUp={interactive ? onFanPointerUp : undefined}
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
            // Outer cards sit lower → arch / held-hand curve
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

            // Hit zone ≈ visible corner strip (top-left), full face on top card
            const isTop = i === n - 1
            const hitW = isTop
              ? layout.cardW
              : Math.max(layout.step + 4, Math.min(layout.cardW * 0.32, 28))
            const hitH = isTop
              ? layout.cardH
              : Math.max(layout.cardH * 0.42, 48)
            const pressed = pressedId === card.id

            return (
              <div
                key={card.id}
                className={[
                  'hand__slot',
                  dimmed ? 'hand__slot--dimmed' : '',
                  pressed ? 'hand__slot--pressed' : '',
                  !dimmed && interactive ? 'hand__slot--live' : '',
                  suitBreak > 0 ? 'hand__slot--suit-break' : '',
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
                  zIndex: i + 1,
                  transform: `translateY(${lift}px) rotate(${rotate}deg)`,
                  visibility: flying ? 'hidden' : 'visible',
                  pointerEvents: flying ? 'none' : 'auto',
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
                      // Big corner identity for tight peeks
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
                  }`}
                  style={{ width: hitW, height: hitH }}
                  onClick={(e) => {
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
    </div>
  )
}

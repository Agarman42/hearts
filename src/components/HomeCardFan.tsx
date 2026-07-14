import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Card } from '../core/types'
import { CardView } from './CardView'

/** Spades run — low to high, Ace on top (right), same order as in-hand sort. */
const FAN_CARDS: readonly Card[] = [
  { id: 'home-9s', suit: 'spades', rank: '9' },
  { id: 'home-10s', suit: 'spades', rank: '10' },
  { id: 'home-js', suit: 'spades', rank: 'J' },
  { id: 'home-qs', suit: 'spades', rank: 'Q' },
  { id: 'home-ks', suit: 'spades', rank: 'K' },
  { id: 'home-as', suit: 'spades', rank: 'A' },
]

const N = FAN_CARDS.length
const PEEK_RATIO = 0.21

export function HomeCardFan() {
  const railRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ cardW: 54, step: 11, cardH: 77 })

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return

    const measure = () => {
      const avail = Math.max(0, el.clientWidth - 8)
      let cardW = Math.min(76, Math.max(46, avail / (1 + PEEK_RATIO * (N - 1))))
      let step = cardW * PEEK_RATIO
      const span = cardW + step * (N - 1)
      if (span > avail) {
        step = Math.max(9, (avail - cardW) / (N - 1))
        const need = cardW + step * (N - 1)
        if (need > avail) {
          cardW = Math.max(42, avail - step * (N - 1))
        }
      }
      setLayout({
        cardW: Math.round(cardW),
        step: Math.round(step * 10) / 10,
        cardH: Math.round(cardW * 1.42),
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
  }, [])

  const archPx = Math.min(16, 6 + N * 0.65)
  const maxRotate = Math.min(9, 3.5 + N * 0.35)
  const fanWidth = layout.cardW + (N - 1) * layout.step
  const fanHeight = layout.cardH + archPx + 6

  return (
    <div className="home-card-fan" style={{ height: fanHeight }} aria-hidden>
      <div className="home-card-fan__rail" ref={railRef}>
        <div
          className="home-card-fan__fan"
          style={{ width: fanWidth, height: fanHeight }}
        >
          {FAN_CARDS.map((card, i) => {
            const t =
              N <= 1 ? 0 : (i - (N - 1) / 2) / Math.max((N - 1) / 2, 1)
            const rotate = t * maxRotate
            const lift = t * t * archPx
            const isAce = card.rank === 'A'
            const slotStyle = {
              left: i * layout.step,
              zIndex: i + 1,
              '--fan-w': `${layout.cardW}px`,
              '--fan-h': `${layout.cardH}px`,
              transform: `translateY(${-lift}px) rotate(${rotate}deg)`,
            } as CSSProperties

            return (
              <div
                key={card.id}
                className={[
                  'home-card-fan__slot',
                  isAce ? 'home-card-fan__slot--ace' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={slotStyle}
              >
                <CardView card={card} size="hand" />
              </div>
            )
          })}
        </div>
      </div>
      <div className="home-card-fan__shadow" />
    </div>
  )
}
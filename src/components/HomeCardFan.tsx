import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Card } from '../core/types'
import { CardView } from './CardView'

/** Ace leading left → 9 on the right, all spades. */
const FAN_CARDS: readonly Card[] = [
  { id: 'home-as', suit: 'spades', rank: 'A' },
  { id: 'home-ks', suit: 'spades', rank: 'K' },
  { id: 'home-qs', suit: 'spades', rank: 'Q' },
  { id: 'home-js', suit: 'spades', rank: 'J' },
  { id: 'home-10s', suit: 'spades', rank: '10' },
  { id: 'home-9s', suit: 'spades', rank: '9' },
]

const N = FAN_CARDS.length

export function HomeCardFan() {
  const railRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ cardW: 58, step: 16, cardH: 82 })

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el) return

    const measure = () => {
      const avail = Math.max(0, el.clientWidth)
      const peekRatio = 0.27
      let cardW = Math.min(80, Math.max(50, avail / (1 + peekRatio * (N - 1))))
      let step = cardW * peekRatio
      const span = cardW + step * (N - 1)
      if (span > avail) {
        step = Math.max(12, (avail - cardW) / (N - 1))
        if (cardW + step * (N - 1) > avail) {
          cardW = Math.max(46, avail - step * (N - 1))
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

  const archPx = Math.min(20, 8 + N * 0.85)
  const maxRotate = 15
  const fanWidth = layout.cardW + (N - 1) * layout.step
  const fanHeight = layout.cardH + archPx + 8

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

            const slotStyle: CSSProperties = {
              left: i * layout.step,
              width: layout.cardW,
              height: layout.cardH,
              zIndex: i + 1,
              transform: `translateY(${lift}px) rotate(${rotate}deg)`,
            }

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
                <CardView
                  card={card}
                  size="hand"
                  style={
                    {
                      '--card-w': `${layout.cardW}px`,
                      '--card-h': `${layout.cardH}px`,
                      '--rank-size': `${Math.round(layout.cardW * 0.3)}px`,
                      '--suit-size': `${Math.round(layout.cardW * 0.26)}px`,
                    } as CSSProperties
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="home-card-fan__shadow" />
    </div>
  )
}
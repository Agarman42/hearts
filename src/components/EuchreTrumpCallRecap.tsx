import { useEffect } from 'react'
import type { Card, Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import type { TrumpCallMethod } from '../games/euchre/engine'
import { CardView } from './CardView'
import './Overlay.css'
import './EuchreTrumpPanel.css'

interface Props {
  makerName: string
  trump: Suit
  method: TrumpCallMethod
  pickedUpCard: Card | null
  turnedDownSuit: Suit | null
  onContinue: () => void
}

const AUTO_ACK_MS = 5200

export function EuchreTrumpCallRecap({
  makerName,
  trump,
  method,
  pickedUpCard,
  turnedDownSuit,
  onContinue,
}: Props) {
  const sym = SUIT_SYMBOL[trump]
  const turnedDownSym = turnedDownSuit ? SUIT_SYMBOL[turnedDownSuit] : null

  useEffect(() => {
    const t = window.setTimeout(onContinue, AUTO_ACK_MS)
    return () => window.clearTimeout(t)
  }, [onContinue, makerName, trump, method])

  return (
    <div
      className="overlay overlay--euchre-trump"
      role="dialog"
      aria-modal="true"
      aria-labelledby="euchre-trump-recap-title"
    >
      <div className="overlay__card euchre-trump-recap">
        <div className="overlay__badge">Trump called</div>
        <h2 id="euchre-trump-recap-title" className="euchre-trump-recap__title">
          <span className="euchre-trump-recap__maker">{makerName}</span>
          {method === 'order_up' ? ' ordered up' : ' named trump'}
        </h2>
        <p className="euchre-trump-recap__trump" aria-label={`Trump suit ${trump}`}>
          <span className="euchre-trump-recap__trump-label">Trump</span>
          <span className="euchre-trump-recap__trump-suit">{sym}</span>
        </p>

        {method === 'order_up' && pickedUpCard ? (
          <div className="euchre-trump-recap__kitty">
            <p className="euchre-trump-recap__kitty-label">From the kitty</p>
            <div className="euchre-trump-recap__kitty-card">
              <CardView card={pickedUpCard} size="hand" />
            </div>
            <p className="euchre-trump-recap__explain">
              The dealer picks up this card — trump is{' '}
              <span className="euchre-trump-recap__suit-inline">{sym}</span> for this hand.
            </p>
          </div>
        ) : (
          <p className="euchre-trump-recap__explain">
            {turnedDownSym ? (
              <>
                Round 2 call — the kitty <span className="euchre-trump-recap__suit-inline">{turnedDownSym}</span>{' '}
                was turned down.
              </>
            ) : (
              <>Round 2 call — trump was named without ordering the kitty.</>
            )}
          </p>
        )}

        <div className="overlay__actions">
          <button type="button" className="btn btn--primary" onClick={onContinue} autoFocus>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
import { useEffect } from 'react'
import type { Card, Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import type { TrumpCallMethod } from '../games/euchre/engine'
import { CardView } from './CardView'
import './Overlay.css'
import './EuchreTrumpPanel.css'

interface Props {
  makerName: string
  dealerName: string
  trump: Suit
  method: TrumpCallMethod
  pickedUpCard: Card | null
  turnedDownSuit: Suit | null
  onContinue: () => void
}

const AUTO_ACK_MS = 6200

export function EuchreTrumpCallRecap({
  makerName,
  dealerName,
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
  }, [onContinue, makerName, dealerName, trump, method])

  return (
    <div
      className="overlay overlay--euchre-trump"
      role="dialog"
      aria-modal="true"
      aria-labelledby="euchre-trump-recap-title"
    >
      <div className="overlay__card euchre-trump-recap">
        <div className="overlay__badge">Trump called</div>
        <p className="euchre-trump-recap__trump" aria-label={`Trump suit ${trump}`}>
          <span className="euchre-trump-recap__trump-label">Trump suit</span>
          <span className="euchre-trump-recap__trump-suit">{sym}</span>
        </p>
        <h2 id="euchre-trump-recap-title" className="euchre-trump-recap__title">
          <span className="euchre-trump-recap__maker">{makerName}</span>
          {method === 'order_up' ? ' ordered up' : ' named trump'}
        </h2>

        {method === 'order_up' && pickedUpCard ? (
          <div className="euchre-trump-recap__kitty">
            <p className="euchre-trump-recap__kitty-label">Kitty card → {dealerName}&apos;s hand</p>
            <div className="euchre-trump-recap__kitty-card">
              <CardView card={pickedUpCard} size="hand" />
            </div>
            <p className="euchre-trump-recap__explain">
              {dealerName} picks up this card. Trump is{' '}
              <span className="euchre-trump-recap__suit-inline">{sym}</span> for the hand.
            </p>
          </div>
        ) : (
          <p className="euchre-trump-recap__explain">
            {turnedDownSym ? (
              <>
                Round 2 — kitty <span className="euchre-trump-recap__suit-inline">{turnedDownSym}</span>{' '}
                was turned down. Trump is{' '}
                <span className="euchre-trump-recap__suit-inline">{sym}</span>.
              </>
            ) : (
              <>
                Trump is <span className="euchre-trump-recap__suit-inline">{sym}</span> this hand.
              </>
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
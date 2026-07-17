import type { Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import './EuchreTrumpPanel.css'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

const SUIT_COLOR: Record<Suit, 'red' | 'black'> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
}

interface Props {
  round: 1 | 2
  upcardSuit?: Suit | null
  turnedDown?: Suit | null
  canOrder?: boolean
  canName?: boolean
  isDealer?: boolean
  onPass: () => void
  onOrderUp?: () => void
  onNameTrump?: (suit: Suit) => void
}

export function EuchreTrumpPanel({
  round,
  upcardSuit,
  turnedDown,
  canOrder = false,
  canName = false,
  isDealer = false,
  onPass,
  onOrderUp,
  onNameTrump,
}: Props) {
  const orderLabel = isDealer ? 'Pick up' : 'Order up'

  return (
    <div className="euchre-trump" role="form" aria-label="Trump bidding">
      <p className="euchre-trump__eyebrow">
        {round === 1 ? 'Round 1' : 'Round 2'}
      </p>
      <h2 className="euchre-trump__title">
        {round === 1 && upcardSuit
          ? `${orderLabel} ${SUIT_SYMBOL[upcardSuit]}?`
          : 'Name trump'}
      </h2>
      <div className="euchre-trump__actions">
        {round === 1 && canOrder && onOrderUp && (
          <button type="button" className="btn btn--primary btn--lg" onClick={onOrderUp}>
            {orderLabel}
          </button>
        )}
        {round === 2 && canName && onNameTrump && (
          <div className="euchre-trump__suit-grid" role="group" aria-label="Choose trump suit">
            {SUITS.filter((s) => s !== turnedDown).map((suit) => (
              <button
                key={suit}
                type="button"
                className={[
                  'euchre-trump__suit-btn',
                  `euchre-trump__suit-btn--${SUIT_COLOR[suit]}`,
                ].join(' ')}
                onClick={() => onNameTrump(suit)}
                aria-label={`Name ${suit} trump`}
              >
                <span className="euchre-trump__suit-symbol" aria-hidden>
                  {SUIT_SYMBOL[suit]}
                </span>
                <span className="euchre-trump__suit-name">{suit}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className="btn btn--ghost btn--lg" onClick={onPass}>
          Pass
        </button>
      </div>
    </div>
  )
}

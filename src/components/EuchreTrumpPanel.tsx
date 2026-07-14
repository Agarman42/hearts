import type { Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import './EuchreTrumpPanel.css'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

interface Props {
  round: 1 | 2
  upcardSuit?: Suit | null
  turnedDown?: Suit | null
  canOrder?: boolean
  canName?: boolean
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
  onPass,
  onOrderUp,
  onNameTrump,
}: Props) {
  return (
    <div className="euchre-trump" role="form" aria-label="Trump bidding">
      <p className="euchre-trump__eyebrow">
        {round === 1 ? 'Round 1' : 'Round 2'}
      </p>
      <h2 className="euchre-trump__title">
        {round === 1 && upcardSuit
          ? `Order up ${SUIT_SYMBOL[upcardSuit]}?`
          : 'Name trump'}
      </h2>
      <div className="euchre-trump__actions">
        {round === 1 && canOrder && onOrderUp && (
          <button type="button" className="btn btn--primary btn--lg" onClick={onOrderUp}>
            Order up
          </button>
        )}
        {round === 2 &&
          canName &&
          onNameTrump &&
          SUITS.filter((s) => s !== turnedDown).map((suit) => (
            <button
              key={suit}
              type="button"
              className="btn btn--primary euchre-trump__suit"
              onClick={() => onNameTrump(suit)}
            >
              {SUIT_SYMBOL[suit]} {suit}
            </button>
          ))}
        <button type="button" className="btn btn--ghost btn--lg" onClick={onPass}>
          Pass
        </button>
      </div>
    </div>
  )
}
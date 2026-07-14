import type { Card, Suit } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import { CardView } from './CardView'
import './EuchreTrumpPanel.css'

interface Props {
  makerName: string
  trump: Suit
  pickedUpCard: Card
}

export function EuchreDiscardPanel({ makerName, trump, pickedUpCard }: Props) {
  const sym = SUIT_SYMBOL[trump]
  return (
    <div className="euchre-trump euchre-trump--discard" role="region" aria-label="Dealer discard">
      <p className="euchre-trump__eyebrow">Dealer discard</p>
      <h2 className="euchre-trump__title">
        {makerName} ordered <span className="euchre-trump__suit-inline">{sym}</span> trump
      </h2>
      <div className="euchre-discard__pickup">
        <div className="euchre-discard__card-wrap" aria-hidden>
          <CardView card={pickedUpCard} size="hand" />
          <span className="euchre-discard__card-badge">Kitty</span>
        </div>
        <p className="euchre-discard__explain">
          This card was added to your hand
          <span className="euchre-discard__highlight-note"> (glowing in your hand below)</span>.
          You have 6 cards — tap one to throw away.
        </p>
      </div>
    </div>
  )
}
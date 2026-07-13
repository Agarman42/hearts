import { Card } from '../../core/types'
import { rankValue } from '../../core/cards'

const SUIT_ORDER: Record<Card['suit'], number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
}

export function sortSpadesHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
    if (sd !== 0) return sd
    return rankValue(b.rank) - rankValue(a.rank)
  })
}
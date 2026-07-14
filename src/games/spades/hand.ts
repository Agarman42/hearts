import { Card } from '../../core/types'
import { rankValue } from '../../core/cards'

/** Black / red / black / red so suit groups are easy to scan in the fan. */
const SUIT_ORDER: Record<Card['suit'], number> = {
  spades: 0,
  hearts: 1,
  clubs: 2,
  diamonds: 3,
}

export function sortSpadesHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
    if (sd !== 0) return sd
    return rankValue(b.rank) - rankValue(a.rank)
  })
}
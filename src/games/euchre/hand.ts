import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { rankValue } from '../../core/cards'
import { cardPower, effectiveSuit } from './rules'

export function sortEuchreHand(hand: Card[], trump: Suit | null): Card[] {
  if (!trump) {
    return [...hand].sort((a, b) => {
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
      return rankValue(a.rank) - rankValue(b.rank)
    })
  }
  return [...hand].sort((a, b) => {
    const aTrump = effectiveSuit(a, trump) === trump
    const bTrump = effectiveSuit(b, trump) === trump
    if (aTrump !== bTrump) return aTrump ? -1 : 1
    if (aTrump && bTrump) return cardPower(b, trump) - cardPower(a, trump)
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return rankValue(a.rank) - rankValue(b.rank)
  })
}
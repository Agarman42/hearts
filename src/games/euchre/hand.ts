import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareSuitGroupRankDesc } from '../../core/cards'
import { cardPower, effectiveSuit } from './rules'

/** Black · red · black · red — off-trump suit groups left-to-right. */
const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

function compareOffTrump(a: Card, b: Card): number {
  return compareSuitGroupRankDesc(a, b, SUIT_ORDER)
}

export function sortEuchreHand(hand: Card[], trump: Suit | null): Card[] {
  if (!trump) {
    return [...hand].sort(compareOffTrump)
  }
  return [...hand].sort((a, b) => {
    const aTrump = effectiveSuit(a, trump) === trump
    const bTrump = effectiveSuit(b, trump) === trump
    if (aTrump !== bTrump) return aTrump ? -1 : 1
    if (aTrump && bTrump) return cardPower(b, trump) - cardPower(a, trump)
    return compareOffTrump(a, b)
  })
}
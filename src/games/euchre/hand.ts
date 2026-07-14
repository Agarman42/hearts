import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareRankDesc } from '../../core/cards'
import { cardPower, effectiveSuit } from './rules'

/** Black · red · black · red — off-trump suit groups left-to-right. */
const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

function compareSuitGroupRankDesc(a: Card, b: Card): number {
  const aIdx = SUIT_ORDER.indexOf(a.suit)
  const bIdx = SUIT_ORDER.indexOf(b.suit)
  if (aIdx !== bIdx) return aIdx - bIdx
  return compareRankDesc(a, b)
}

export function sortEuchreHand(hand: Card[], trump: Suit | null): Card[] {
  if (!trump) {
    return [...hand].sort(compareSuitGroupRankDesc)
  }
  return [...hand].sort((a, b) => {
    const aTrump = effectiveSuit(a, trump) === trump
    const bTrump = effectiveSuit(b, trump) === trump
    if (aTrump !== bTrump) return aTrump ? -1 : 1
    if (aTrump && bTrump) return cardPower(b, trump) - cardPower(a, trump)
    return compareSuitGroupRankDesc(a, b)
  })
}
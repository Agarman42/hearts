import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareSuitGroupRankDesc } from '../../core/cards'
import { cardPower, effectiveSuit } from './rules'

/** Black · red · black · red — off-trump suit groups left-to-right. */
const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

const isRedSuit = (suit: Suit): boolean => suit === 'hearts' || suit === 'diamonds'

/**
 * Off-trump suit groups alternate red/black left-to-right.
 * Start with the more common color so leftovers don't clump (e.g. trump♠ → ♥♣♦ as R-B-R).
 */
function offTrumpSuitOrder(trump: Suit): Suit[] {
  const remaining = SUIT_ORDER.filter((s) => s !== trump)
  const reds = remaining.filter(isRedSuit)
  const blacks = remaining.filter((s) => !isRedSuit(s))
  const ordered: Suit[] = []
  // Prefer starting with black when equal; otherwise start with the majority color.
  let preferBlack = blacks.length >= reds.length
  while (reds.length > 0 || blacks.length > 0) {
    if (preferBlack && blacks.length > 0) {
      ordered.push(blacks.shift()!)
      preferBlack = false
    } else if (!preferBlack && reds.length > 0) {
      ordered.push(reds.shift()!)
      preferBlack = true
    } else if (blacks.length > 0) {
      ordered.push(blacks.shift()!)
      preferBlack = false
    } else {
      ordered.push(reds.shift()!)
      preferBlack = true
    }
  }
  return ordered
}

function compareOffTrump(a: Card, b: Card, trump: Suit | null): number {
  const order = trump ? offTrumpSuitOrder(trump) : SUIT_ORDER
  return compareSuitGroupRankDesc(a, b, order)
}

export function sortEuchreHand(hand: Card[], trump: Suit | null): Card[] {
  if (!trump) {
    return [...hand].sort((a, b) => compareOffTrump(a, b, null))
  }
  return [...hand].sort((a, b) => {
    const aTrump = effectiveSuit(a, trump) === trump
    const bTrump = effectiveSuit(b, trump) === trump
    if (aTrump !== bTrump) return aTrump ? -1 : 1
    if (aTrump && bTrump) return cardPower(b, trump) - cardPower(a, trump)
    return compareOffTrump(a, b, trump)
  })
}
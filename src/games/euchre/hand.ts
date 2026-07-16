import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareSuitGroupRankDesc } from '../../core/cards'
import { cardPower, effectiveSuit } from './rules'

/** Black · red · black · red — off-trump suit groups left-to-right. */
const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

const isRedSuit = (suit: Suit): boolean => suit === 'hearts' || suit === 'diamonds'

/** Off-trump groups alternate red/black even when trump removes one suit. */
function offTrumpSuitOrder(trump: Suit): Suit[] {
  const remaining = SUIT_ORDER.filter((s) => s !== trump)
  const reds = remaining.filter(isRedSuit)
  const blacks = remaining.filter((s) => !isRedSuit(s))
  const ordered: Suit[] = []
  const startBlack = remaining.length > 0 && !isRedSuit(remaining[0])
  let ri = 0
  let bi = 0
  if (startBlack) {
    while (bi < blacks.length || ri < reds.length) {
      if (bi < blacks.length) ordered.push(blacks[bi++])
      if (ri < reds.length) ordered.push(reds[ri++])
    }
  } else {
    while (ri < reds.length || bi < blacks.length) {
      if (ri < reds.length) ordered.push(reds[ri++])
      if (bi < blacks.length) ordered.push(blacks[bi++])
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
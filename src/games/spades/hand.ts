import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareSuitGroupRankDesc } from '../../core/cards'

/** Black / red / black / red so suit groups are easy to scan in the fan. */
const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

export function sortSpadesHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => compareSuitGroupRankDesc(a, b, SUIT_ORDER))
}
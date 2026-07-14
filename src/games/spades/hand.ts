import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareRankDescThenSuit } from '../../core/cards'

/** Black / red / black / red — tiebreaker when ranks match. */
const SUIT_ORDER: readonly Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']

export function sortSpadesHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => compareRankDescThenSuit(a, b, SUIT_ORDER))
}
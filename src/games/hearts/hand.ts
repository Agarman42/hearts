import type { Card } from '../../core/types'
import { compareSuitGroupRankDesc } from '../../core/cards'
import { HEARTS_HAND_SUIT_ORDER } from './types'

export function compareHeartsHandCards(a: Card, b: Card): number {
  return compareSuitGroupRankDesc(a, b, HEARTS_HAND_SUIT_ORDER)
}

export function sortHeartsHand(cards: Card[]): Card[] {
  return [...cards].sort(compareHeartsHandCards)
}
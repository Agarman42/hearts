import type { Card } from '../../core/types'
import { compareRankDescThenSuit } from '../../core/cards'
import { HEARTS_HAND_SUIT_ORDER } from './types'

export function compareHeartsHandCards(a: Card, b: Card): number {
  return compareRankDescThenSuit(a, b, HEARTS_HAND_SUIT_ORDER)
}

export function sortHeartsHand(cards: Card[]): Card[] {
  return [...cards].sort(compareHeartsHandCards)
}
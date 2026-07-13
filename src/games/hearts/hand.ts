import type { Card } from '../../core/types'
import { rankValue } from '../../core/cards'
import { HEARTS_HAND_SUIT_ORDER } from './types'

export function compareHeartsHandCards(a: Card, b: Card): number {
  if (a.suit !== b.suit) {
    return (
      HEARTS_HAND_SUIT_ORDER.indexOf(a.suit as (typeof HEARTS_HAND_SUIT_ORDER)[number]) -
      HEARTS_HAND_SUIT_ORDER.indexOf(b.suit as (typeof HEARTS_HAND_SUIT_ORDER)[number])
    )
  }
  return rankValue(b.rank) - rankValue(a.rank)
}

export function sortHeartsHand(cards: Card[]): Card[] {
  return [...cards].sort(compareHeartsHandCards)
}
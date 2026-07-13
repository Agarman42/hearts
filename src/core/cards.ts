import { Card, Rank, Suit, SUIT_SYMBOL } from './types'

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

export function rankValue(rank: Rank): number {
  return RANK_VALUE[rank]
}

export function cardId(suit: Suit, rank: Rank): string {
  return `${rank}${SUIT_SYMBOL[suit]}`
}

export function makeCard(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank }
}

export function isSameCard(a: Card, b: Card): boolean {
  return a.id === b.id
}

export function formatCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`
}
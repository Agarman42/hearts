import {
  Card,
  HAND_SUIT_ORDER,
  Rank,
  RANKS,
  Suit,
  SUIT_SYMBOL,
  SUITS,
} from './types'

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

/**
 * Hand sort: Hearts → Spades → Diamonds → Clubs,
 * and within each suit highest → lowest (A left, 2 right of that suit block).
 */
export function compareCards(a: Card, b: Card): number {
  if (a.suit !== b.suit) {
    return HAND_SUIT_ORDER.indexOf(a.suit) - HAND_SUIT_ORDER.indexOf(b.suit)
  }
  // Highest rank first (left)
  return rankValue(b.rank) - rankValue(a.rank)
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort(compareCards)
}

export function isSameCard(a: Card, b: Card): boolean {
  return a.id === b.id
}

export function isQueenOfSpades(card: Card): boolean {
  return card.suit === 'spades' && card.rank === 'Q'
}

export function isHeart(card: Card): boolean {
  return card.suit === 'hearts'
}

/** Penalty points in classic Hearts. */
export function heartsPenalty(card: Card): number {
  if (isQueenOfSpades(card)) return 13
  if (isHeart(card)) return 1
  return 0
}

export function formatCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`
}

export function createFullDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(suit, rank))
    }
  }
  return deck
}

import type { Card } from '../../core/types'

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
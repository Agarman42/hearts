import type { Card } from '../../core/types'
import type { HeartsRulesConfig } from './types'

export function isQueenOfSpades(card: Card): boolean {
  return card.suit === 'spades' && card.rank === 'Q'
}

export function isJackOfDiamonds(card: Card): boolean {
  return card.suit === 'diamonds' && card.rank === 'J'
}

export function isHeart(card: Card): boolean {
  return card.suit === 'hearts'
}

/** Penalty points in classic Hearts (optional J♦ −10 house rule). */
export function heartsPenalty(
  card: Card,
  rules?: Pick<HeartsRulesConfig, 'jackOfDiamonds'>,
): number {
  if (rules?.jackOfDiamonds && isJackOfDiamonds(card)) return -10
  if (isQueenOfSpades(card)) return 13
  if (isHeart(card)) return 1
  return 0
}
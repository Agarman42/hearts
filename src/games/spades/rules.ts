import { Card, Seat } from '../../core/types'
import { rankValue } from '../../core/cards'
import { TrickPlay } from '../types'
import type { SpadesRulesConfig } from './types'

export function trickWinner(plays: TrickPlay[], spadesBroken = true): Seat {
  void spadesBroken
  if (plays.length === 0) throw new Error('empty trick')
  const leadSuit = plays[0].card.suit
  let best = plays[0]
  for (const p of plays.slice(1)) {
    const card = p.card
    const bestCard = best.card
    const isTrump = card.suit === 'spades'
    const bestIsTrump = bestCard.suit === 'spades'
    if (isTrump && !bestIsTrump) {
      best = p
      continue
    }
    if (!isTrump && bestIsTrump) continue
    if (isTrump && bestIsTrump) {
      if (rankValue(card.rank) > rankValue(bestCard.rank)) best = p
      continue
    }
    if (card.suit === leadSuit && bestCard.suit === leadSuit) {
      if (rankValue(card.rank) > rankValue(bestCard.rank)) best = p
    }
  }
  return best.seat
}

export function legalMoves(
  hand: Card[],
  trick: TrickPlay[],
  spadesBroken: boolean,
): Card[] {
  if (hand.length === 0) return []
  if (trick.length === 0) {
    if (!spadesBroken) {
      const nonSpades = hand.filter((c) => c.suit !== 'spades')
      if (nonSpades.length > 0) return nonSpades
    }
    return hand
  }
  const leadSuit = trick[0].card.suit
  const inSuit = hand.filter((c) => c.suit === leadSuit)
  if (inSuit.length > 0) return inSuit
  return hand
}

/** Team bid must be at least 1 (standard American). */
export function validateBid(bid: number, nil: boolean, rules: SpadesRulesConfig): boolean {
  if (nil) return rules.nilBids && bid === 0
  return Number.isInteger(bid) && bid >= 0 && bid <= 13
}

export function teamId(seat: Seat): 'ns' | 'ew' {
  return seat === 0 || seat === 2 ? 'ns' : 'ew'
}

export function partnerSeat(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat
}

export function applyBagPenalty(
  bags: number,
  rules: SpadesRulesConfig,
): { bags: number; penalty: number } {
  if (!rules.bagPenalty) return { bags, penalty: 0 }
  const sets = Math.floor(bags / rules.bagsPerPenalty)
  const remainder = bags % rules.bagsPerPenalty
  if (rules.bagMercy && sets > 0) {
    return { bags: remainder, penalty: 0 }
  }
  return {
    bags: remainder,
    penalty: sets * rules.bagPenaltyPoints,
  }
}
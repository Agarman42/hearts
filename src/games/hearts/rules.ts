import { Card, Seat } from '../../core/types'
import { makeCard, rankValue } from '../../core/cards'
import { TrickPlay } from '../types'
import { heartsPenalty, isHeart, isQueenOfSpades } from './scoring'
import type { HeartsRulesConfig } from './types'

export function findTwoOfClubs(hands: Record<Seat, Card[]>): Seat | null {
  const two = makeCard('clubs', '2')
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    if (hands[seat].some((c) => c.id === two.id)) return seat
  }
  return null
}

/**
 * Seats: 0 South (you), 1 West, 2 North, 3 East (around the table).
 * From South looking at the table: West is on your LEFT, East on your RIGHT.
 * Pass left → seat +1 (South → West); pass right → seat +3 (South → East).
 * When everyone passes the same way, you always receive from the opposite side
 * (pass right → receive from your left, and vice versa).
 */
export function passTarget(from: Seat, direction: 'left' | 'right' | 'across'): Seat {
  if (direction === 'left') return ((from + 1) % 4) as Seat
  if (direction === 'right') return ((from + 3) % 4) as Seat
  return ((from + 2) % 4) as Seat
}

/** Who is passing cards TO this seat for the given direction. */
export function passSource(to: Seat, direction: 'left' | 'right' | 'across'): Seat {
  // Inverse of passTarget
  if (direction === 'left') return ((to + 3) % 4) as Seat
  if (direction === 'right') return ((to + 1) % 4) as Seat
  return ((to + 2) % 4) as Seat
}

export function trickWinner(plays: TrickPlay[]): Seat {
  if (plays.length === 0) throw new Error('empty trick')
  const leadSuit = plays[0].card.suit
  let best = plays[0]
  for (const p of plays.slice(1)) {
    if (p.card.suit === leadSuit && rankValue(p.card.rank) > rankValue(best.card.rank)) {
      best = p
    }
  }
  return best.seat
}

export function trickPoints(plays: TrickPlay[]): number {
  return plays.reduce((sum, p) => sum + heartsPenalty(p.card), 0)
}

export function legalMoves(
  hand: Card[],
  trick: TrickPlay[],
  heartsBroken: boolean,
  isFirstTrick: boolean,
  rules: HeartsRulesConfig,
): Card[] {
  if (hand.length === 0) return []

  // Leading
  if (trick.length === 0) {
    if (isFirstTrick && rules.twoOfClubsLeads) {
      const two = hand.find((c) => c.suit === 'clubs' && c.rank === '2')
      if (two) return [two]
    }
    let candidates = hand
    if (rules.heartsBreak && !heartsBroken) {
      const nonHearts = hand.filter((c) => !isHeart(c))
      if (nonHearts.length > 0) candidates = nonHearts
    }
    return candidates
  }

  const leadSuit = trick[0].card.suit
  const inSuit = hand.filter((c) => c.suit === leadSuit)
  if (inSuit.length > 0) return inSuit

  // Void — any card, with first-trick penalty restriction
  let candidates = hand
  if (isFirstTrick && rules.noPointsOnFirstTrick) {
    const safe = hand.filter((c) => !isHeart(c) && !isQueenOfSpades(c))
    if (safe.length > 0) candidates = safe
  }
  return candidates
}

export function isLegalPlay(
  card: Card,
  hand: Card[],
  trick: TrickPlay[],
  heartsBroken: boolean,
  isFirstTrick: boolean,
  rules: HeartsRulesConfig,
): boolean {
  return legalMoves(hand, trick, heartsBroken, isFirstTrick, rules).some(
    (c) => c.id === card.id,
  )
}

export function illegalReason(
  card: Card,
  hand: Card[],
  trick: TrickPlay[],
  heartsBroken: boolean,
  isFirstTrick: boolean,
  rules: HeartsRulesConfig,
): string | null {
  if (!hand.some((c) => c.id === card.id)) return 'That card is not in your hand.'
  if (isLegalPlay(card, hand, trick, heartsBroken, isFirstTrick, rules)) return null

  if (trick.length === 0) {
    if (isFirstTrick && rules.twoOfClubsLeads) {
      const two = hand.find((c) => c.suit === 'clubs' && c.rank === '2')
      if (two && card.id !== two.id) return 'The 2♣ must lead the first trick.'
    }
    if (rules.heartsBreak && !heartsBroken && isHeart(card)) {
      return 'Hearts are not broken yet — you cannot lead hearts.'
    }
    return 'That lead is not allowed right now.'
  }

  const leadSuit = trick[0].card.suit
  const inSuit = hand.filter((c) => c.suit === leadSuit)
  if (inSuit.length > 0 && card.suit !== leadSuit) {
    return `You must follow suit (${leadSuit}).`
  }

  if (isFirstTrick && rules.noPointsOnFirstTrick) {
    if (isHeart(card)) return 'You cannot play a heart on the first trick.'
    if (isQueenOfSpades(card)) return 'You cannot play the Queen of Spades on the first trick.'
  }

  return 'That play is not legal.'
}

export function applyMoonScoring(
  handPoints: Record<Seat, number>,
  enabled: boolean,
): { scores: Record<Seat, number>; moonShooter: Seat | null } {
  const scores = { ...handPoints } as Record<Seat, number>
  if (!enabled) return { scores, moonShooter: null }

  for (const seat of [0, 1, 2, 3] as Seat[]) {
    if (handPoints[seat] === 26) {
      const result: Record<Seat, number> = { 0: 26, 1: 26, 2: 26, 3: 26 }
      result[seat] = 0
      return { scores: result, moonShooter: seat }
    }
  }
  return { scores, moonShooter: null }
}

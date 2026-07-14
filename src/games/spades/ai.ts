import { Card, Seat } from '../../core/types'
import { rankValue } from '../../core/cards'
import type { AiDifficulty } from '../../core/types'
import { partnerOf } from '../../core/partnership'
import type { TrickPlay } from '../types'
import { legalMoves, trickWinner } from './rules'
import type { PlayerBid } from './scoring'

function countSuit(hand: Card[], suit: Card['suit']): number {
  return hand.filter((c) => c.suit === suit).length
}

function highSpades(hand: Card[]): number {
  return hand
    .filter((c) => c.suit === 'spades')
    .reduce((max, c) => Math.max(max, rankValue(c.rank)), 0)
}

export interface BidContext {
  seat: Seat
  bids: Partial<Record<Seat, PlayerBid>>
}

/** Simple bid: count likely winners + spade length bonus; partner context adjusts cover. */
export function chooseBid(
  hand: Card[],
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  context?: BidContext,
): { bid: number; nil: boolean } {
  if (hand.length === 0) return { bid: 0, nil: false }

  let estimate = 0
  for (const suit of ['hearts', 'diamonds', 'clubs'] as const) {
    const inSuit = hand.filter((c) => c.suit === suit)
    if (inSuit.length === 0) continue
    const top = Math.max(...inSuit.map((c) => rankValue(c.rank)))
    if (top >= 12) estimate += 1
    else if (top >= 10 && inSuit.length >= 4) estimate += 1
  }
  const spades = countSuit(hand, 'spades')
  estimate += Math.floor(spades / 3)
  if (highSpades(hand) >= 13) estimate += 1

  if (context) {
    const partner = partnerOf(context.seat)
    const partnerBid = context.bids[partner]
    if (partnerBid?.nil) {
      estimate += difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1
    } else if (partnerBid && !partnerBid.nil && partnerBid.bid >= 7) {
      estimate -= difficulty === 'easy' ? 0 : 1
    } else if (partnerBid && !partnerBid.nil && partnerBid.bid <= 3) {
      estimate += 1
    }
  }

  const noise =
    difficulty === 'easy' ? Math.floor(rng() * 3) - 1 : difficulty === 'hard' ? 1 : 0
  const bid = Math.max(1, Math.min(13, estimate + noise))

  if (difficulty === 'hard' && spades <= 1 && estimate <= 1 && rng() < 0.08) {
    return { bid: 0, nil: true }
  }

  return { bid, nil: false }
}

export function choosePlay(
  hand: Card[],
  trick: TrickPlay[],
  spadesBroken: boolean,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  seat: Seat = 0,
): Card {
  const legal = legalMoves(hand, trick, spadesBroken)
  if (legal.length === 1) return legal[0]

  if (trick.length === 0) {
    const nonTrump = legal.filter((c) => c.suit !== 'spades')
    const lead = nonTrump.length > 0 ? nonTrump : legal
    if (difficulty === 'easy') {
      return lead.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
    }
    return lead.reduce((a, b) => (rankValue(a.rank) > rankValue(b.rank) ? a : b))
  }

  const leadSuit = trick[0].card.suit
  const inSuit = legal.filter((c) => c.suit === leadSuit)
  const sim = (card: Card) => {
    const plays = [...trick, { seat, card }]
    return trickWinner(plays, spadesBroken) === seat
  }

  if (inSuit.length > 0) {
    const winners = inSuit.filter(sim)
    if (winners.length > 0) {
      return winners.reduce((a, b) => (rankValue(a.rank) > rankValue(b.rank) ? a : b))
    }
    if (difficulty === 'easy' && rng() < 0.35) {
      return inSuit.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
    }
    return inSuit.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
  }

  const spades = legal.filter((c) => c.suit === 'spades')
  if (spades.length > 0 && difficulty !== 'easy' && rng() < 0.55) {
    return spades.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
  }
  return legal.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
}
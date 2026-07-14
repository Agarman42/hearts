import { Card, Seat } from '../../core/types'
import { rankValue } from '../../core/cards'
import type { AiDifficulty } from '../../core/types'
import { partnerOf, partnershipOf } from '../../core/partnership'
import type { TrickPlay } from '../types'
import { legalMoves, trickWinner } from './rules'
import { teamContractBid, type PlayerBid } from './scoring'
import { DEFAULT_SPADES_RULES, type SpadesRulesConfig } from './types'

function countSuit(hand: Card[], suit: Card['suit']): number {
  return hand.filter((c) => c.suit === suit).length
}

function highSpades(hand: Card[]): number {
  return hand
    .filter((c) => c.suit === 'spades')
    .reduce((max, c) => Math.max(max, rankValue(c.rank)), 0)
}

function lowest(cards: Card[]): Card {
  return cards.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
}

function highest(cards: Card[]): Card {
  return cards.reduce((a, b) => (rankValue(a.rank) > rankValue(b.rank) ? a : b))
}

function wouldWin(
  card: Card,
  trick: TrickPlay[],
  seat: Seat,
  spadesBroken: boolean,
): boolean {
  return trickWinner([...trick, { seat, card }], spadesBroken) === seat
}

function currentWinner(trick: TrickPlay[], spadesBroken: boolean): Seat | null {
  if (trick.length === 0) return null
  return trickWinner(trick, spadesBroken)
}

function teamTricks(seat: Seat, tricksWon: Record<Seat, number>): number {
  const team = partnershipOf(seat)
  const seats: Seat[] = team === 'ns' ? [0, 2] : [1, 3]
  return seats.reduce<number>((sum, s) => sum + tricksWon[s], 0)
}

function tricksNeeded(
  seat: Seat,
  bids: Partial<Record<Seat, PlayerBid>>,
  tricksWon: Record<Seat, number>,
): number {
  const bid = teamContractBid(partnershipOf(seat), bids)
  return Math.max(0, bid - teamTricks(seat, tricksWon))
}

function isBagRisk(
  seat: Seat,
  bids: Partial<Record<Seat, PlayerBid>>,
  tricksWon: Record<Seat, number>,
): boolean {
  const bid = teamContractBid(partnershipOf(seat), bids)
  return teamTricks(seat, tricksWon) >= bid && bid > 0
}

function partnerWinning(
  trick: TrickPlay[],
  seat: Seat,
  spadesBroken: boolean,
): boolean {
  const w = currentWinner(trick, spadesBroken)
  return w != null && partnerOf(seat) === w
}

function opponentWinning(
  trick: TrickPlay[],
  seat: Seat,
  spadesBroken: boolean,
): boolean {
  const w = currentWinner(trick, spadesBroken)
  return w != null && partnershipOf(w) !== partnershipOf(seat)
}

function safeSloughs(
  legal: Card[],
  trick: TrickPlay[],
  seat: Seat,
  spadesBroken: boolean,
): Card[] {
  return legal.filter((c) => !wouldWin(c, trick, seat, spadesBroken))
}

export interface BidContext {
  seat: Seat
  bids: Partial<Record<Seat, PlayerBid>>
  teamScores?: Record<'ns' | 'ew', number>
  teamBags?: Record<'ns' | 'ew', number>
  rules?: SpadesRulesConfig
}

export interface PlayContext {
  seat: Seat
  bids: Partial<Record<Seat, PlayerBid>>
  tricksWon: Record<Seat, number>
  teamBags: Record<'ns' | 'ew', number>
  rules: SpadesRulesConfig
}

/** Simple bid: count likely winners + spade length; partner/team context adjusts cover. */
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
    const team = partnershipOf(context.seat)

    if (partnerBid?.nil) {
      estimate += difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1
    } else if (partnerBid && !partnerBid.nil && partnerBid.bid >= 7) {
      estimate -= difficulty === 'easy' ? 0 : 1
    } else if (partnerBid && !partnerBid.nil && partnerBid.bid <= 3) {
      estimate += 1
    }

    const teamBidSoFar =
      (context.bids[context.seat]?.nil ? 0 : context.bids[context.seat]?.bid ?? 0) +
      (partnerBid?.nil ? 0 : partnerBid?.bid ?? 0)
    if (teamBidSoFar >= 11 && estimate > 2) estimate -= 1

    const bags = context.teamBags?.[team] ?? 0
    const bagsPer = context.rules?.bagsPerPenalty ?? 10
    if (context.rules?.bagPenalty && bags >= bagsPer - 2 && estimate > 3) {
      estimate -= 1
    }

    const myScore = context.teamScores?.[team] ?? 0
    const oppScore = context.teamScores?.[team === 'ns' ? 'ew' : 'ns'] ?? 0
    if (difficulty === 'hard' && myScore < oppScore - 40) estimate += 1
  }

  const noise =
    difficulty === 'easy' ? Math.floor(rng() * 3) - 1 : difficulty === 'hard' ? 1 : 0
  const bid = Math.max(1, Math.min(13, estimate + noise))

  if (
    difficulty === 'hard' &&
    context?.rules?.nilBids !== false &&
    spades <= 1 &&
    estimate <= 1 &&
    rng() < 0.08
  ) {
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
  context?: PlayContext,
): Card {
  const legal = legalMoves(hand, trick, spadesBroken)
  if (legal.length === 1) return legal[0]

  const ctx: PlayContext = context ?? {
    seat,
    bids: {},
    tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    teamBags: { ns: 0, ew: 0 },
    rules: DEFAULT_SPADES_RULES,
  }

  const need = tricksNeeded(seat, ctx.bids, ctx.tricksWon)
  const bagRisk = isBagRisk(seat, ctx.bids, ctx.tricksWon)
  const iNil = ctx.bids[seat]?.nil ?? false
  const pNil = ctx.bids[partnerOf(seat)]?.nil ?? false
  const cardsLeft = hand.length
  const desperate = need >= cardsLeft && need > 0
  const shouldTakeTrick = (need > 0 || pNil) && (!bagRisk || desperate)

  if (iNil) {
    if (trick.length === 0) {
      const nonTrump = legal.filter((c) => c.suit !== 'spades')
      return lowest(nonTrump.length > 0 ? nonTrump : legal)
    }
    const safe = safeSloughs(legal, trick, seat, spadesBroken)
    return safe.length > 0 ? lowest(safe) : lowest(legal)
  }

  if (trick.length === 0) {
    const nonTrump = legal.filter((c) => c.suit !== 'spades')
    const pool = !spadesBroken && nonTrump.length > 0 ? nonTrump : legal

    if (bagRisk && !desperate) return lowest(pool)
    if (pNil) return lowest(pool)

    if (need > 0 && difficulty !== 'easy') {
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
      let bestSuit: Card['suit'] | null = null
      let bestLen = 0
      for (const suit of suits) {
        const len = pool.filter((c) => c.suit === suit).length
        if (len > bestLen) {
          bestLen = len
          bestSuit = suit
        }
      }
      if (bestSuit && bestLen >= 3) {
        const suitCards = pool.filter((c) => c.suit === bestSuit)
        return highest(suitCards)
      }
      return highest(pool)
    }

    if (difficulty === 'easy') return lowest(pool)
    return need > 0 ? highest(pool) : lowest(pool)
  }

  const leadSuit = trick[0].card.suit
  const inSuit = legal.filter((c) => c.suit === leadSuit)
  const partnerAhead = partnerWinning(trick, seat, spadesBroken)
  const oppAhead = opponentWinning(trick, seat, spadesBroken)

  if (inSuit.length > 0) {
    if (partnerAhead) {
      const safe = safeSloughs(inSuit, trick, seat, spadesBroken)
      return safe.length > 0 ? lowest(safe) : lowest(inSuit)
    }

    const winners = inSuit.filter((c) => wouldWin(c, trick, seat, spadesBroken))
    const losers = inSuit.filter((c) => !winners.includes(c))

    if (winners.length > 0 && shouldTakeTrick && oppAhead) {
      if (difficulty === 'easy' && rng() < 0.3 && losers.length > 0) {
        return lowest(losers)
      }
      return lowest(winners)
    }

    if (bagRisk && winners.length > 0 && losers.length > 0) {
      return lowest(losers)
    }

    if (losers.length > 0) return lowest(losers)
    if (difficulty === 'easy' && rng() < 0.35) return lowest(inSuit)
    return lowest(inSuit)
  }

  const nonTrump = legal.filter((c) => c.suit !== 'spades')
  const spades = legal.filter((c) => c.suit === 'spades')

  if (partnerAhead) {
    const safe = safeSloughs(legal, trick, seat, spadesBroken)
    if (safe.length > 0) {
      const safeOffTrump = safe.filter((c) => c.suit !== 'spades')
      return lowest(safeOffTrump.length > 0 ? safeOffTrump : safe)
    }
    return lowest(nonTrump.length > 0 ? nonTrump : legal)
  }

  if (oppAhead) {
    const trumpWinners = spades.filter((c) => wouldWin(c, trick, seat, spadesBroken))

    if (trumpWinners.length > 0 && shouldTakeTrick) {
      if (difficulty === 'easy' && rng() < 0.4 && nonTrump.length > 0) {
        return lowest(nonTrump)
      }
      return lowest(trumpWinners)
    }

    if (nonTrump.length > 0) return lowest(nonTrump)
    if (spades.length > 0 && !shouldTakeTrick) return lowest(spades)
    return lowest(legal)
  }

  if (nonTrump.length > 0) return lowest(nonTrump)
  return lowest(legal)
}
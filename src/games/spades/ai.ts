import { Card, Seat } from '../../core/types'
import { rankValue } from '../../core/cards'
import type { AiDifficulty } from '../../core/types'
import {
  countOppVoidsInSuit,
  detectVoids,
  isMasterInSuit,
  type TrickRecord,
} from '../../core/cardMemory'
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

function honorTricks(hand: Card[], suit: Card['suit']): number {
  const inSuit = hand.filter((c) => c.suit === suit)
  if (inSuit.length === 0) return 0
  let tricks = 0
  const hasAce = inSuit.some((c) => c.rank === 'A')
  const hasKing = inSuit.some((c) => c.rank === 'K')
  const hasQueen = inSuit.some((c) => c.rank === 'Q')
  if (hasAce) tricks += inSuit.length >= 2 ? 1 : 0.65
  if (hasKing && inSuit.length >= 3) tricks += 0.55
  if (hasQueen && inSuit.length >= 4) tricks += 0.35
  if (inSuit.length >= 5) tricks += 0.5
  return tricks
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

function bagPressure(seat: Seat, ctx: PlayContext): 'none' | 'caution' | 'critical' {
  const bags = ctx.teamBags[partnershipOf(seat)]
  const threshold = ctx.rules.bagsPerPenalty
  if (bags >= threshold - 1) return 'critical'
  if (bags >= threshold - 3) return 'caution'
  return 'none'
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

/** Win tricks with high leads so a nil partner can dump dangerous cards. */
function leadToCoverNil(pool: Card[], _difficulty: AiDifficulty): Card {
  let bestCard: Card | null = null
  let bestScore = -1
  for (const c of pool) {
    const suitLen = pool.filter((x) => x.suit === c.suit).length
    let score = suitLen * 0.5
    if (c.rank === 'A') score += 12
    else if (c.rank === 'K') score += 7
    else if (c.rank === 'Q') score += 3
    if (score > bestScore) {
      bestScore = score
      bestCard = c
    }
  }
  if (bestCard?.rank === 'A') return bestCard
  const aces = pool.filter((c) => c.rank === 'A')
  if (aces.length > 0) return highest(aces)
  if (bestCard) return bestCard
  return highest(pool)
}

function cleanOpponentNils(seat: Seat, ctx: PlayContext): Seat[] {
  const out: Seat[] = []
  for (const s of [0, 1, 2, 3] as Seat[]) {
    if (partnershipOf(s) === partnershipOf(seat)) continue
    if (ctx.bids[s]?.nil && (ctx.tricksWon[s] ?? 0) === 0) out.push(s)
  }
  return out
}

function sloughForPartner(
  legal: Card[],
  trick: TrickPlay[],
  seat: Seat,
  spadesBroken: boolean,
): Card | null {
  const safe = safeSloughs(legal, trick, seat, spadesBroken)
  if (safe.length > 0) {
    const offTrump = safe.filter((c) => c.suit !== 'spades')
    return lowest(offTrump.length > 0 ? offTrump : safe)
  }
  return null
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
  /** Completed tricks this hand (for card memory). */
  completedTricks?: TrickRecord[]
  /** Card ids already played this hand (completed + current). */
  playedIds?: Set<string>
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
  let voids = 0
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as const) {
    const inSuit = hand.filter((c) => c.suit === suit)
    if (inSuit.length === 0) {
      if (suit !== 'spades') voids += 1
      continue
    }
    estimate += honorTricks(hand, suit)
  }
  const spades = countSuit(hand, 'spades')
  if (spades >= 4) estimate += 0.75
  if (highSpades(hand) >= 13) estimate += 0.5
  if (voids > 0 && spades >= 2) estimate += voids * 0.4
  estimate = Math.round(estimate)

  if (context) {
    const partner = partnerOf(context.seat)
    const partnerBid = context.bids[partner]
    const team = partnershipOf(context.seat)

    if (partnerBid?.nil) {
      estimate += difficulty === 'easy' ? 1 : 2
    } else if (partnerBid && !partnerBid.nil && partnerBid.bid >= 7) {
      estimate -= difficulty === 'easy' ? 0 : 2
    } else if (partnerBid && !partnerBid.nil && partnerBid.bid <= 3) {
      estimate += 1
    }

    if (partnerBid && !partnerBid.nil) {
      const maxUseful = Math.max(1, 13 - partnerBid.bid)
      estimate = Math.min(estimate, maxUseful)
    }

    const teamBidSoFar =
      (context.bids[context.seat]?.nil ? 0 : context.bids[context.seat]?.bid ?? 0) +
      (partnerBid?.nil ? 0 : partnerBid?.bid ?? 0)
    if (teamBidSoFar >= 12 && estimate > 2) estimate -= 2
    else if (teamBidSoFar >= 10 && estimate > 2) estimate -= 1

    const bags = context.teamBags?.[team] ?? 0
    const bagsPer = context.rules?.bagsPerPenalty ?? 10
    if (context.rules?.bagPenalty && bags >= bagsPer - 2 && estimate > 3) {
      estimate -= Math.floor(bags / Math.max(1, bagsPer - 2))
    }

    // Hard: only stretch when far behind and the hand supports it
    const myScore = context.teamScores?.[team] ?? 0
    const oppScore = context.teamScores?.[team === 'ns' ? 'ew' : 'ns'] ?? 0
    if (difficulty === 'hard' && myScore < oppScore - 50 && voids >= 1 && spades >= 3) {
      estimate += 1
    }
  }

  // Nil shape: low winner estimate, few spades, no aces, no high spades, not too many kings.
  // (Old rules almost never fired — estimate/A-K gates were too tight.)
  const aces = hand.filter((c) => c.rank === 'A').length
  const kings = hand.filter((c) => c.rank === 'K').length
  const highSpadeCount = hand.filter(
    (c) => c.suit === 'spades' && rankValue(c.rank) >= rankValue('J'),
  ).length
  const partnerAlreadyNil =
    context != null && Boolean(context.bids[partnerOf(context.seat)]?.nil)
  const nilAllowed = context?.rules?.nilBids !== false && !partnerAlreadyNil
  // Soft nil: no aces, no jack+ spades, at most one king, few low spades.
  // A void helps but is not required — 4-suit baby hands are classic nils.
  const nilShape =
    estimate <= 2 &&
    spades <= 3 &&
    aces === 0 &&
    highSpadeCount === 0 &&
    kings <= 1 &&
    (voids >= 1 || spades <= 2)

  if (nilAllowed && nilShape) {
    if (difficulty === 'hard') {
      if (estimate <= 1) return { bid: 0, nil: true }
      if (estimate === 2 && (voids >= 1 || spades <= 1) && rng() < 0.55) {
        return { bid: 0, nil: true }
      }
    } else if (difficulty === 'medium' && rng() < (estimate <= 1 ? 0.7 : 0.35)) {
      return { bid: 0, nil: true }
    } else if (difficulty === 'easy' && estimate <= 1 && rng() < 0.35) {
      return { bid: 0, nil: true }
    }
  }

  // Easy soft; hard calibrates from sure masters (aces + boss spades).
  const noise = difficulty === 'easy' ? -1 : 0
  let bid = Math.max(1, Math.min(13, estimate + noise))

  if (difficulty === 'hard') {
    const emptyPlayed = new Set<string>()
    const masters = hand.filter((c) => isMasterInSuit(c, hand, emptyPlayed)).length
    const spadeLen = countSuit(hand, 'spades')
    // Floor near clear winners; cap wild optimism on soft shape
    const floor = Math.min(masters + Math.max(0, spadeLen - 3), 7)
    if (bid < floor) bid = floor
    if (bid >= 4 && bid <= 6) {
      const honors =
        hand.filter((c) => c.rank === 'A' || c.rank === 'K').length +
        hand.filter((c) => c.suit === 'spades' && c.rank === 'Q').length
      if (honors <= 2 && masters <= 1) bid = Math.max(1, bid - 1)
    }
  }

  return { bid, nil: false }
}

export function choosePlay(
  hand: Card[],
  trick: TrickPlay[],
  spadesBroken: boolean,
  difficulty: AiDifficulty,
  _rng: () => number = Math.random,
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
  const bags = bagPressure(seat, ctx)
  const iNil = ctx.bids[seat]?.nil ?? false
  const partnerSeat = partnerOf(seat)
  const pNil = ctx.bids[partnerSeat]?.nil ?? false
  const nilPartnerStillClean = pNil && (ctx.tricksWon[partnerSeat] ?? 0) === 0
  const cardsLeft = hand.length
  const desperate = need >= cardsLeft && need > 0
  const hard = difficulty === 'hard'
  const smart = hard || difficulty === 'medium'
  // Only cover while partner's nil is still clean — after they take a book, stop
  // burning winners and go back to contract/bag management.
  const oppNils = cleanOpponentNils(seat, ctx)
  const setOppNil = smart && oppNils.length > 0 && !iNil
  const nilCoverUrgent = nilPartnerStillClean
  // Hard/medium: after making contract, fight to set the other team unless bags critical
  const oppTeam = partnershipOf(seat) === 'ns' ? 'ew' : 'ns'
  const oppNeed = tricksNeeded(
    oppTeam === 'ns' ? 0 : 1,
    ctx.bids,
    ctx.tricksWon,
  )
  const trySetOpponents =
    (difficulty === 'hard' || difficulty === 'medium') &&
    need === 0 &&
    oppNeed > 0 &&
    bags !== 'critical' &&
    !pNil &&
    !iNil
  // Bag pressure only when already at/over contract — never refuse needed books
  const bagBlockOvertricks =
    bags === 'critical' && need === 0 && !nilCoverUrgent && !nilPartnerStillClean && !trySetOpponents
  const shouldTakeTrick =
    (need > 0 || nilCoverUrgent || trySetOpponents) &&
    (!bagRisk || desperate || nilCoverUrgent || trySetOpponents) &&
    !bagBlockOvertricks

  const playedIds = ctx.playedIds ?? new Set<string>()
  const voids = detectVoids(ctx.completedTricks ?? [], trick)
  const endgame = cardsLeft <= 3

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

    if (bagRisk && !desperate && !pNil && !trySetOpponents && !setOppNil) return lowest(pool)
    if (pNil && !(bagRisk && bags === 'critical' && !nilPartnerStillClean)) {
      return leadToCoverNil(pool, difficulty)
    }
    // Squeeze an opponent nil: lead junk, never cash an ace they can duck under.
    if (setOppNil && !nilCoverUrgent) {
      return lowest(pool)
    }

    if (need > 0 || trySetOpponents) {
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
      // Prefer master winners; never lead bare non-master king into ruffs
      let best: Card | null = null
      let bestScore = -Infinity
      for (const suit of suits) {
        if (!spadesBroken && suit === 'spades' && nonTrump.length > 0) continue
        const suitCards = pool.filter((c) => c.suit === suit)
        if (suitCards.length === 0) continue
        const ace = suitCards.find((c) => c.rank === 'A')
        const king = suitCards.find((c) => c.rank === 'K')
        const master =
          suitCards.find((c) => isMasterInSuit(c, hand, playedIds)) ?? null
        let score = suitCards.length * 3
        if (master) score += hard ? 28 : 20
        else if (ace) score += 18
        if (king && !ace && !master) score -= hard ? 18 : 12
        if (suit === 'spades') score += need >= 2 ? 8 : -5
        // Avoid leading suits opponents are known void in (ruff risk)
        if (smart) {
          const oppVoids = countOppVoidsInSuit(suit, seat, voids, partnerSeat)
          score -= oppVoids * 14
        }
        if (score > bestScore) {
          bestScore = score
          if (master) best = master
          else if (ace) best = ace
          else if (king && !ace && suitCards.length >= 2) best = lowest(suitCards)
          else best = lowest(suitCards)
        }
      }
      if (best) return best
      if (spadesBroken && pool.some((c) => c.suit === 'spades') && need >= 2) {
        const sp = pool.filter((c) => c.suit === 'spades')
        const masterSp = sp.find((c) => isMasterInSuit(c, hand, playedIds))
        if (masterSp) return masterSp
        return lowest(sp)
      }
      return lowest(pool)
    }

    return lowest(pool)
  }

  const leadSuit = trick[0].card.suit
  const inSuit = legal.filter((c) => c.suit === leadSuit)
  const partnerAhead = partnerWinning(trick, seat, spadesBroken)
  const oppAhead = opponentWinning(trick, seat, spadesBroken)
  const winnerNow = currentWinner(trick, spadesBroken)
  const oppNilAhead = setOppNil && winnerNow != null && oppNils.includes(winnerNow)

  // Let a clean opponent nil eat the book. Overtaking them would save their nil.
  if (oppNilAhead && !nilCoverUrgent) {
    const duck = legal.filter((c) => !wouldWin(c, trick, seat, spadesBroken))
    if (duck.length > 0) return lowest(duck)
  }

  // Endgame: bank needed books when an opponent is winning — never overtake partner
  if (smart && endgame && shouldTakeTrick && oppAhead) {
    const winners = legal.filter((c) => wouldWin(c, trick, seat, spadesBroken))
    if (winners.length > 0) {
      const off = winners.filter((c) => c.suit !== 'spades')
      return lowest(off.length > 0 ? off : winners)
    }
  }

  /** Steal the trick from a nil partner so they do not collect a book. */
  const overtakeNilPartner = (pool: Card[]): Card | null => {
    if (!pNil || !partnerAhead) return null
    const winners = pool.filter((c) => wouldWin(c, trick, seat, spadesBroken))
    if (winners.length === 0) return null
    const trumpWins = winners.filter((c) => c.suit === 'spades')
    if (trumpWins.length > 0) return lowest(trumpWins)
    return lowest(winners)
  }

  if (inSuit.length > 0) {
    if (partnerAhead) {
      const steal = overtakeNilPartner(inSuit)
      if (steal) return steal
      // When we still need books, bank a sure winner if partner's card is soft
      if (smart && shouldTakeTrick && need > 0 && !pNil) {
        const partnerCard = trick.find((p) => p.seat === partnerSeat)?.card
        const pr = partnerCard ? rankValue(partnerCard.rank) : 14
        const winnersOverPartner = inSuit.filter((c) =>
          wouldWin(c, trick, seat, spadesBroken),
        )
        if (pr < rankValue('K') && winnersOverPartner.length > 0) {
          return lowest(winnersOverPartner)
        }
      }
      const slough = sloughForPartner(inSuit, trick, seat, spadesBroken)
      if (slough) return slough
      return lowest(inSuit)
    }

    const winners = inSuit.filter((c) => wouldWin(c, trick, seat, spadesBroken))
    const losers = inSuit.filter((c) => !winners.includes(c))

    // Second hand: take cheapest winner when we need books; prefer masters.
    if (smart && trick.length === 1 && !pNil && !desperate && losers.length > 0) {
      if (!shouldTakeTrick) return lowest(losers)
      if (winners.length > 0) {
        const masterWins = winners.filter((c) => isMasterInSuit(c, hand, playedIds))
        if (masterWins.length > 0) return lowest(masterWins)
        return lowest(winners)
      }
      return lowest(losers)
    }

    // Third hand high when opponent is winning and we need the trick
    if (smart && trick.length === 2 && oppAhead && winners.length > 0 && shouldTakeTrick) {
      return lowest(winners)
    }

    if (winners.length > 0 && shouldTakeTrick && oppAhead) {
      return lowest(winners)
    }

    // Last seat: always bank a needed book
    if (smart && trick.length === 3 && winners.length > 0 && shouldTakeTrick) {
      return lowest(winners)
    }

    if (bagRisk && !pNil && !trySetOpponents && winners.length > 0 && losers.length > 0) {
      return lowest(losers)
    }

    if (losers.length > 0) return lowest(losers)
    return lowest(inSuit)
  }

  const nonTrump = legal.filter((c) => c.suit !== 'spades')
  const spades = legal.filter((c) => c.suit === 'spades')

  if (partnerAhead) {
    const steal = overtakeNilPartner(legal)
    if (steal) return steal
    const slough = sloughForPartner(legal, trick, seat, spadesBroken)
    if (slough) return slough
    return lowest(nonTrump.length > 0 ? nonTrump : legal)
  }

  if (oppAhead) {
    const trumpWinners = spades.filter((c) => wouldWin(c, trick, seat, spadesBroken))

    // Cover nil / need books / set: ruff with cheapest winner; hard prefers master spade late
    if (trumpWinners.length > 0 && (shouldTakeTrick || pNil)) {
      if (hard && endgame) {
        const master = trumpWinners.find((c) => isMasterInSuit(c, hand, playedIds))
        if (master && trumpWinners.length === 1) return master
      }
      return lowest(trumpWinners)
    }

    if (nonTrump.length > 0) return lowest(nonTrump)
    if (spades.length > 0 && !shouldTakeTrick && !pNil) return lowest(spades)
    return lowest(legal)
  }

  if (nonTrump.length > 0) return lowest(nonTrump)
  return lowest(legal)
}
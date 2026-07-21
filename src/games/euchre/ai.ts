import { Card, Seat } from '../../core/types'
import type { Suit } from '../../core/types'
import type { AiDifficulty } from '../../core/types'
import { rankValue } from '../../core/cards'
import type { PartnershipId } from '../../core/partnership'
import { partnerOf, partnershipOf } from '../../core/partnership'
import { lonerBlockedNearWin } from './scoring'
import type { TrickPlay } from '../types'
import {
  cardPower,
  effectiveSuit,
  isLeftBower,
  isRightBower,
  legalMoves,
  trickWinner,
} from './rules'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

/** Same-color suit — classic "next" call when upcard is turned down. */
const NEXT_SUIT: Record<Suit, Suit> = {
  hearts: 'diamonds',
  diamonds: 'hearts',
  spades: 'clubs',
  clubs: 'spades',
}

function trumpCount(hand: Card[], trump: Suit): number {
  return hand.filter((c) => effectiveSuit(c, trump) === trump).length
}

function hasBower(hand: Card[], trump: Suit): boolean {
  return hand.some((c) => isRightBower(c, trump) || isLeftBower(c, trump))
}

function lowest(cards: Card[]): Card {
  return cards.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
}

function lowestTrump(cards: Card[], trump: Suit): Card {
  return cards.reduce((a, b) => (cardPower(a, trump) < cardPower(b, trump) ? a : b))
}

function cheapestWinner(
  legal: Card[],
  trick: TrickPlay[],
  trump: Suit,
  seat: Seat,
): Card | null {
  const winners = legal.filter((c) => trickWinner([...trick, { seat, card: c }], trump) === seat)
  if (winners.length === 0) return null
  return winners.reduce((a, b) => (cardPower(a, trump) < cardPower(b, trump) ? a : b))
}

function suitGroups(hand: Card[], trump: Suit): Map<Suit, Card[]> {
  const map = new Map<Suit, Card[]>()
  for (const c of hand) {
    const s = effectiveSuit(c, trump)
    const list = map.get(s) ?? []
    list.push(c)
    map.set(s, list)
  }
  return map
}

export interface EuchrePlayContext {
  seat: Seat
  maker?: Seat | null
  trump?: Suit
  makerTeam?: ReturnType<typeof partnershipOf> | null
  loner?: boolean
  tricksWon?: Record<Seat, number>
  /** Cards already played this hand (completed tricks + current). */
  playedIds?: Set<string>
  sittingOut?: Seat | null
}

function teamTricksFor(
  team: ReturnType<typeof partnershipOf>,
  tricksWon: Record<Seat, number>,
): number {
  const seats: Seat[] = team === 'ns' ? [0, 2] : [1, 3]
  return seats.reduce<number>((sum, s) => sum + (tricksWon[s] ?? 0), 0)
}

/**
 * Makers need 3 tricks to score. Defenders need 3 to euchre.
 * (Previously defenders only fought for 1 trick — partners soft-played after that.)
 */
function teamGoals(opts: {
  onMakerTeam: boolean
  defending: boolean
  isLoner: boolean
  makerTricks: number
  defenderTricks: number
}): {
  tricksNeeded: number
  mustWinTrick: boolean
  wantMarch: boolean
  marchThreat: boolean
} {
  const { onMakerTeam, defending, isLoner, makerTricks, defenderTricks } = opts
  if (onMakerTeam) {
    const makeGoal = 3
    const marchGoal = isLoner ? 5 : 5
    const tricksNeeded = Math.max(0, makeGoal - makerTricks)
    const wantMarch = isLoner && makerTricks >= 3 && makerTricks < marchGoal
    return {
      tricksNeeded,
      // Keep fighting until the point is banked (or loner march still live)
      mustWinTrick: tricksNeeded > 0 || wantMarch,
      wantMarch,
      marchThreat: false,
    }
  }
  if (defending) {
    // Euchre = hold makers under 3 ⇒ defenders need 3 books
    const tricksNeeded = Math.max(0, 3 - defenderTricks)
    return {
      tricksNeeded,
      mustWinTrick: tricksNeeded > 0,
      wantMarch: false,
      marchThreat: makerTricks >= 2,
    }
  }
  return { tricksNeeded: 0, mustWinTrick: false, wantMarch: false, marchThreat: false }
}

/** Stronger hand evaluation for ordering / naming trump. */
function orderScore(hand: Card[], trump: Suit, upcard?: Card): number {
  let score = trumpCount(hand, trump) * 2.5
  if (hand.some((c) => isRightBower(c, trump))) score += 6
  else if (hand.some((c) => isLeftBower(c, trump))) score += 4
  if (upcard) {
    if (isRightBower(upcard, trump)) score += 5
    else if (isLeftBower(upcard, trump)) score += 4
    else if (effectiveSuit(upcard, trump) === trump) {
      score += cardPower(upcard, trump) >= 54 ? 3 : cardPower(upcard, trump) >= 50 ? 2 : 1
    }
  }
  const offAces = hand.filter(
    (c) => c.rank === 'A' && effectiveSuit(c, trump) !== trump,
  ).length
  score += offAces * 1.5
  for (const suit of SUITS) {
    if (suit === trump) continue
    const inSuit = hand.filter((c) => effectiveSuit(c, trump) === suit)
    if (
      inSuit.some((c) => c.rank === 'K') &&
      (inSuit.some((c) => c.rank === 'A') || inSuit.length >= 2)
    ) {
      score += 0.75
    }
  }
  // Thin hands without a bower are liability calls
  if (!hasBower(hand, trump) && trumpCount(hand, trump) < 3) score -= 3
  return score
}

function dealerPickupAdjust(
  hand: Card[],
  trump: Suit,
  upcard: Card | undefined,
  bidderSeat: Seat,
  dealerSeat: Seat,
): number {
  const bidderTeam = partnershipOf(bidderSeat)
  const dealerTeam = partnershipOf(dealerSeat)
  if (bidderTeam === dealerTeam) {
    // Ordering to partner/self: still need real shape
    if (bidderSeat === dealerSeat) return hasBower(hand, trump) ? 1.5 : -0.5
    return hasBower(hand, trump) ? 1 : -1
  }
  // Ordering to opponent dealer — upcard helps them
  let penalty = -8
  if (upcard && effectiveSuit(upcard, trump) === trump) {
    const power = cardPower(upcard, trump)
    if (power >= 99) penalty -= 5
    else if (power >= 50) penalty -= 3
    else penalty -= 1.5
  }
  if (trumpCount(hand, trump) <= 2 && !hasBower(hand, trump)) penalty -= 3
  if (trumpCount(hand, trump) <= 1) penalty -= 2
  return penalty
}

function orderThreshold(difficulty: AiDifficulty): number {
  // Stricter — thin orders were setting partners constantly
  return difficulty === 'hard' ? 11.5 : difficulty === 'medium' ? 13.5 : 16
}

function hasCallableTrump(hand: Card[], trump: Suit, upcard?: Card): boolean {
  const inHand = trumpCount(hand, trump)
  const bower = hasBower(hand, trump)
  // Need a bower or real depth — never call on two low trump alone
  if (bower && inHand >= 2) return true
  if (inHand >= 3 && bower) return true
  if (inHand >= 4) return true
  if (
    upcard &&
    effectiveSuit(upcard, trump) === trump &&
    inHand >= 2 &&
    (bower || cardPower(upcard, trump) >= 54)
  ) {
    return true
  }
  return false
}

export function chooseOrderUp(
  hand: Card[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  upcard?: Card,
  bidderSeat: Seat = 0,
  dealerSeat: Seat = 0,
): boolean {
  if (!hasCallableTrump(hand, trump, upcard)) {
    return false
  }

  let score = orderScore(hand, trump, upcard)
  score += dealerPickupAdjust(hand, trump, upcard, bidderSeat, dealerSeat)

  // Never order to the other team without a bower
  if (
    partnershipOf(bidderSeat) !== partnershipOf(dealerSeat) &&
    !hasBower(hand, trump)
  ) {
    return false
  }

  const threshold = orderThreshold(difficulty)
  if (score >= threshold) return true
  if (difficulty === 'easy') return score >= 12 && hasBower(hand, trump) && rng() < 0.05
  return false
}

export function chooseTrumpSuit(
  hand: Card[],
  turnedDown: Suit | null,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
): Suit | null {
  const options = SUITS.filter((s) => s !== turnedDown)
  const next = turnedDown ? NEXT_SUIT[turnedDown] : null

  let best: Suit | null = null
  let bestScore = 0
  for (const suit of options) {
    if (!hasCallableTrump(hand, suit)) continue
    let score = orderScore(hand, suit)
    if (difficulty !== 'easy' && next === suit) score += difficulty === 'hard' ? 1.5 : 1
    if (score > bestScore) {
      bestScore = score
      best = suit
    }
  }

  const threshold = orderThreshold(difficulty)
  if (best && bestScore >= threshold) return best
  if (difficulty === 'easy' && best && bestScore >= 10 && hasBower(hand, best) && rng() < 0.05) {
    return best
  }
  if (
    difficulty === 'medium' &&
    best &&
    bestScore >= 12.5 &&
    hasBower(hand, best) &&
    rng() < 0.05
  ) {
    return best
  }
  return null
}

export function chooseGoAlone(
  hand: Card[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  opts?: {
    makerTeam?: PartnershipId
    teamScores?: Record<PartnershipId, number>
    raceTo?: number
  },
): boolean {
  if (
    opts?.makerTeam &&
    opts.teamScores &&
    opts.raceTo != null &&
    lonerBlockedNearWin(opts.makerTeam, opts.teamScores, opts.raceTo)
  ) {
    return false
  }

  const count = trumpCount(hand, trump)
  const bower = hasBower(hand, trump)
  const bothBowers =
    hand.some((c) => isRightBower(c, trump)) && hand.some((c) => isLeftBower(c, trump))
  const offAces = hand.filter(
    (c) => c.rank === 'A' && effectiveSuit(c, trump) !== trump,
  ).length

  if (difficulty === 'hard') {
    if (bothBowers && (count >= 3 || offAces >= 1)) return true
    if (count >= 4 && bower && offAces >= 1) return true
    if (count >= 5 && bower) return true
    return false
  }
  if (difficulty === 'medium') {
    return (count >= 4 && bothBowers) || (count >= 5 && bower && rng() < 0.5)
  }
  return count >= 5 && bothBowers && rng() < 0.25
}

export function chooseDiscard(hand: Card[], trump: Suit, lockedCardId?: string | null): Card {
  const pool = lockedCardId ? hand.filter((c) => c.id !== lockedCardId) : hand
  const candidates = pool.length > 0 ? pool : hand
  const groups = suitGroups(candidates, trump)
  const offTrump = [...groups.entries()].filter(([suit]) => suit !== trump)

  if (offTrump.length > 0) {
    const ranked = offTrump.sort((a, b) => {
      if (a[1].length !== b[1].length) return a[1].length - b[1].length
      const aHasAce = a[1].some((c) => c.rank === 'A')
      const bHasAce = b[1].some((c) => c.rank === 'A')
      if (aHasAce !== bHasAce) return aHasAce ? 1 : -1
      return 0
    })
    const [, cards] = ranked[0]!
    if (cards.length > 1) {
      const nonAce = cards.filter((c) => c.rank !== 'A')
      const dumpFrom = nonAce.length > 0 ? nonAce : cards
      return dumpFrom.reduce((a, b) => (cardPower(a, trump) > cardPower(b, trump) ? a : b))
    }
    return cards[0]!
  }

  return lowestTrump(candidates, trump)
}

/**
 * Medium and hard share team-aware play. Easy uses a simplified path
 * that still knows not to overtake partner and to fight for the contract.
 */
export function choosePlay(
  hand: Card[],
  trick: TrickPlay[],
  trump: Suit,
  difficulty: AiDifficulty,
  _rng: () => number = Math.random,
  seat: Seat = 0,
  ctx?: EuchrePlayContext,
): Card {
  const legal = legalMoves(hand, trick, trump)
  if (legal.length === 1) return legal[0]

  if (difficulty === 'easy') {
    return choosePlayEasy(hand, legal, trick, trump, seat, ctx)
  }

  return choosePlayTeam(hand, legal, trick, trump, seat, ctx, difficulty)
}

function choosePlayEasy(
  _hand: Card[],
  legal: Card[],
  trick: TrickPlay[],
  trump: Suit,
  seat: Seat,
  ctx?: EuchrePlayContext,
): Card {
  const maker = ctx?.maker ?? null
  const makerTeam = ctx?.makerTeam ?? (maker != null ? partnershipOf(maker) : null)
  const onMakerTeam = makerTeam != null && partnershipOf(seat) === makerTeam
  const defending = makerTeam != null && !onMakerTeam
  const isLoner = ctx?.loner ?? false
  const tricksWon = ctx?.tricksWon ?? { 0: 0, 1: 0, 2: 0, 3: 0 }
  const makerTricks = makerTeam != null ? teamTricksFor(makerTeam, tricksWon) : 0
  const defenderTeam = makerTeam === 'ns' ? 'ew' : makerTeam === 'ew' ? 'ns' : null
  const defenderTricks =
    defenderTeam != null ? teamTricksFor(defenderTeam, tricksWon) : 0
  const { mustWinTrick } = teamGoals({
    onMakerTeam,
    defending,
    isLoner,
    makerTricks,
    defenderTricks,
  })
  const partnerSeat = partnerOf(seat)

  if (trick.length === 0) {
    const trumpCards = legal.filter((c) => effectiveSuit(c, trump) === trump)
    if (onMakerTeam && trumpCards.length >= 2) return lowestTrump(trumpCards, trump)
    const off = legal.filter((c) => effectiveSuit(c, trump) !== trump)
    return off.length > 0 ? lowest(off) : lowest(legal)
  }

  const winner = trickWinner(trick, trump)
  if (winner === partnerSeat) {
    const keep = legal.filter(
      (c) => trickWinner([...trick, { seat, card: c }], trump) === partnerSeat,
    )
    return keep.length > 0 ? lowest(keep) : lowest(legal)
  }

  if (partnershipOf(winner) !== partnershipOf(seat) && mustWinTrick) {
    const cheap = cheapestWinner(legal, trick, trump, seat)
    if (cheap) return cheap
  }

  const off = legal.filter((c) => effectiveSuit(c, trump) !== trump)
  return off.length > 0 ? lowest(off) : lowest(legal)
}

/**
 * Team-first play for medium/hard: protect partner winners, take needed books,
 * fight for euchre until 3 defender tricks, lead power when strong.
 */
function choosePlayTeam(
  hand: Card[],
  legal: Card[],
  trick: TrickPlay[],
  trump: Suit,
  seat: Seat,
  ctx: EuchrePlayContext | undefined,
  difficulty: AiDifficulty,
): Card {
  const maker = ctx?.maker ?? null
  const makerTeam = ctx?.makerTeam ?? (maker != null ? partnershipOf(maker) : null)
  const onMakerTeam = makerTeam != null && partnershipOf(seat) === makerTeam
  const defending = makerTeam != null && !onMakerTeam
  const isLoner = ctx?.loner ?? false
  const tricksWon = ctx?.tricksWon ?? { 0: 0, 1: 0, 2: 0, 3: 0 }
  const makerTricks = makerTeam != null ? teamTricksFor(makerTeam, tricksWon) : 0
  const defenderTeam = makerTeam === 'ns' ? 'ew' : makerTeam === 'ew' ? 'ns' : null
  const defenderTricks =
    defenderTeam != null ? teamTricksFor(defenderTeam, tricksWon) : 0
  const { mustWinTrick, marchThreat, wantMarch } = teamGoals({
    onMakerTeam,
    defending,
    isLoner,
    makerTricks,
    defenderTricks,
  })
  const partnerSeat = partnerOf(seat)
  const myTrump = trumpCount(hand, trump)
  const leading = trick.length === 0
  const lastToPlay = trick.length === 3 || (isLoner && trick.length === 2)
  void difficulty

  // ---- Lead ----
  if (leading) {
    const trumpCards = legal.filter((c) => effectiveSuit(c, trump) === trump)
    const offTrump = legal.filter((c) => effectiveSuit(c, trump) !== trump)
    const right = trumpCards.find((c) => isRightBower(c, trump))
    const left = trumpCards.find((c) => isLeftBower(c, trump))
    const pullWithPower =
      (isLoner && onMakerTeam && trumpCards.length >= 2) ||
      (onMakerTeam && right && trumpCards.length >= 3) ||
      (onMakerTeam && right && left && trumpCards.length >= 2)

    if (pullWithPower && right) return right
    if (pullWithPower && left) return left

    // Maker team with trump: draw trump (low) to protect partner's off-suit
    if (onMakerTeam && trumpCards.length >= 2 && mustWinTrick) {
      return lowestTrump(trumpCards, trump)
    }

    // Defenders: lead trump to cut makers when holding depth
    if (defending && trumpCards.length >= 2 && mustWinTrick) {
      return lowestTrump(trumpCards, trump)
    }

    // Cash a sure off-ace when not needing to pull
    if (offTrump.length > 0) {
      const aces = offTrump.filter((c) => c.rank === 'A')
      if (aces.length > 0 && (!mustWinTrick || myTrump <= 1)) {
        return aces[0]!
      }
      // Lead from shortest off suit (void development)
      const bySuit = new Map<Suit, Card[]>()
      for (const c of offTrump) {
        const list = bySuit.get(c.suit) ?? []
        list.push(c)
        bySuit.set(c.suit, list)
      }
      const sorted = [...bySuit.entries()].sort((a, b) => a[1].length - b[1].length)
      const short = sorted[0]?.[1] ?? offTrump
      return lowest(short)
    }

    if (trumpCards.length > 0) return lowestTrump(trumpCards, trump)
    return lowest(legal)
  }

  const winner = trickWinner(trick, trump)
  const partnerWinning = winner === partnerSeat
  const opponentWinning = partnershipOf(winner) !== partnershipOf(seat)

  // ---- Partner is winning: NEVER overtake; dump lowest safe ----
  if (partnerWinning) {
    const keepPartner = legal.filter(
      (c) => trickWinner([...trick, { seat, card: c }], trump) === partnerSeat,
    )
    if (keepPartner.length > 0) {
      // Prefer non-trump dumps so we keep trump for later
      const off = keepPartner.filter((c) => effectiveSuit(c, trump) !== trump)
      return lowest(off.length > 0 ? off : keepPartner)
    }
    // Forced to overtake? Play absolute lowest (shouldn't win if keep empty)
    return lowest(legal)
  }

  // ---- Opponent winning: take if we need the book ----
  if (opponentWinning) {
    const cheap = cheapestWinner(legal, trick, trump, seat)
    const needIt = mustWinTrick || marchThreat || wantMarch

    if (cheap && needIt) {
      return cheap
    }

    // Defenders one trick from euchre — always take if able
    if (cheap && defending && defenderTricks === 2) {
      return cheap
    }

    // Cannot or should not win — dump off-suit low, never waste high trump
    const losers = legal.filter(
      (c) => trickWinner([...trick, { seat, card: c }], trump) !== seat,
    )
    if (losers.length > 0) {
      const off = losers.filter((c) => effectiveSuit(c, trump) !== trump)
      return lowest(off.length > 0 ? off : losers)
    }
    return lowest(legal)
  }

  // ---- We are currently winning mid-trick (led) ----
  void lastToPlay
  {
    const off = legal.filter((c) => effectiveSuit(c, trump) !== trump)
    if (off.length > 0) return lowest(off)
    return lowest(legal)
  }
}

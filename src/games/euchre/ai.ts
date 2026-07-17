import { Card, Seat } from '../../core/types'
import type { Suit } from '../../core/types'
import type { AiDifficulty } from '../../core/types'
import { makeCard, rankValue } from '../../core/cards'
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
  // Off-suit aces that can cash after trump is pulled
  const offAces = hand.filter(
    (c) => c.rank === 'A' && effectiveSuit(c, trump) !== trump,
  ).length
  score += offAces * 1.5
  // Protected kings (A or multiple in suit)
  for (const suit of SUITS) {
    if (suit === trump) continue
    const inSuit = hand.filter((c) => effectiveSuit(c, trump) === suit)
    if (inSuit.some((c) => c.rank === 'K') && (inSuit.some((c) => c.rank === 'A') || inSuit.length >= 2)) {
      score += 0.75
    }
  }
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
    if (bidderSeat === dealerSeat) return hasBower(hand, trump) ? 2 : 0.5
    return hasBower(hand, trump) ? 1.5 : 0.25
  }
  let penalty = -7
  if (upcard && effectiveSuit(upcard, trump) === trump) {
    const power = cardPower(upcard, trump)
    if (power >= 99) penalty -= 4
    else if (power >= 50) penalty -= 2.5
    else penalty -= 1
  }
  const wouldHelpThem = trumpCount(hand, trump) <= 1 && !hasBower(hand, trump)
  if (wouldHelpThem) penalty -= 2.5
  return penalty
}

function orderThreshold(difficulty: AiDifficulty): number {
  // Hard is slightly more willing to call with real shape
  return difficulty === 'hard' ? 9.5 : difficulty === 'medium' ? 12 : 14
}

function hasCallableTrump(hand: Card[], trump: Suit, upcard?: Card): boolean {
  const inHand = trumpCount(hand, trump)
  if (inHand >= 3 || hasBower(hand, trump)) return true
  if (
    upcard &&
    effectiveSuit(upcard, trump) === trump &&
    inHand >= 2 &&
    (hasBower(hand, trump) || cardPower(upcard, trump) >= 50)
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

  const threshold = orderThreshold(difficulty)
  if (score >= threshold) return true
  if (difficulty === 'easy') return score >= 10 && hasBower(hand, trump) && rng() < 0.06
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
  if (difficulty === 'easy' && best && bestScore >= 8 && rng() < 0.06) return best
  if (
    difficulty === 'medium' &&
    best &&
    bestScore >= 11 &&
    hasBower(hand, best) &&
    rng() < 0.08
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
    hand.some((c) => isRightBower(c, trump)) &&
    hand.some((c) => isLeftBower(c, trump))
  const offAces = hand.filter(
    (c) => c.rank === 'A' && effectiveSuit(c, trump) !== trump,
  ).length

  if (difficulty === 'hard') {
    // Strong loner hands only — both bowers, or deep trump + ace outs
    if (bothBowers && (count >= 3 || offAces >= 1)) return true
    if (count >= 4 && bower && offAces >= 1) return true
    if (count >= 5 && bower) return true
    return false
  }
  if (difficulty === 'medium') {
    return (count >= 4 && bower) || (bothBowers && count >= 4 && rng() < 0.75)
  }
  return count >= 4 && bower && rng() < 0.35
}

export function chooseDiscard(hand: Card[], trump: Suit, lockedCardId?: string | null): Card {
  const pool = lockedCardId ? hand.filter((c) => c.id !== lockedCardId) : hand
  const candidates = pool.length > 0 ? pool : hand
  const groups = suitGroups(candidates, trump)
  const offTrump = [...groups.entries()].filter(([suit]) => suit !== trump)

  if (offTrump.length > 0) {
    // Prefer voiding shortest suit; keep off aces when possible
    const ranked = offTrump.sort((a, b) => {
      if (a[1].length !== b[1].length) return a[1].length - b[1].length
      const aHasAce = a[1].some((c) => c.rank === 'A')
      const bHasAce = b[1].some((c) => c.rank === 'A')
      if (aHasAce !== bHasAce) return aHasAce ? 1 : -1
      return 0
    })
    const [, cards] = ranked[0]
    // From the void suit, dump highest (clear the suit); avoid dumping ace if multi-card
    if (cards.length > 1) {
      const nonAce = cards.filter((c) => c.rank !== 'A')
      const dumpFrom = nonAce.length > 0 ? nonAce : cards
      return dumpFrom.reduce((a, b) => (cardPower(a, trump) > cardPower(b, trump) ? a : b))
    }
    return cards[0]
  }

  return lowestTrump(candidates, trump)
}

/**
 * Hard AI: score every legal card. Medium/easy keep simpler rule paths.
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

  if (difficulty === 'hard') {
    return choosePlayHard(hand, legal, trick, trump, seat, ctx)
  }

  return choosePlayBasic(hand, legal, trick, trump, difficulty, seat, ctx)
}

function choosePlayBasic(
  _hand: Card[],
  legal: Card[],
  trick: TrickPlay[],
  trump: Suit,
  _difficulty: AiDifficulty,
  seat: Seat,
  ctx?: EuchrePlayContext,
): Card {
  const wouldWin = (card: Card) =>
    trickWinner([...trick, { seat, card }], trump) === seat

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
  const trickGoal = isLoner && onMakerTeam ? 5 : 3
  const tricksNeeded = onMakerTeam ? Math.max(0, trickGoal - makerTricks) : 0
  const defenderTricksNeeded = defending
    ? isLoner
      ? Math.max(0, 3 - defenderTricks)
      : Math.max(0, 1 - defenderTricks)
    : 0
  const mustWinTrick = tricksNeeded > 0 || defenderTricksNeeded > 0

  if (trick.length === 0) {
    const trumpCards = legal.filter((c) => effectiveSuit(c, trump) === trump)
    const offTrump = legal.filter((c) => effectiveSuit(c, trump) !== trump)

    if (defending && trumpCards.length >= 2) {
      return lowestTrump(trumpCards, trump)
    }

    if (onMakerTeam && trumpCards.length >= 2) {
      return lowestTrump(trumpCards, trump)
    }

    if (offTrump.length > 0) {
      const bySuit = new Map<Suit, Card[]>()
      for (const c of offTrump) {
        const list = bySuit.get(c.suit) ?? []
        list.push(c)
        bySuit.set(c.suit, list)
      }
      const sorted = [...bySuit.entries()].sort((a, b) => a[1].length - b[1].length)
      return lowest(sorted[0]?.[1] ?? offTrump)
    }

    return lowestTrump(legal, trump)
  }

  const winner = trickWinner(trick, trump)
  const partnerSeat = partnerOf(seat)
  const partnerWinning = partnerSeat === winner
  const opponentWinning = partnershipOf(winner) !== partnershipOf(seat)
  const lastToPlay = trick.length === 3

  if (partnerWinning) {
    const keepsPartnerWinning = legal.filter(
      (c) => trickWinner([...trick, { seat, card: c }], trump) === partnerSeat,
    )
    if (keepsPartnerWinning.length > 0) return lowest(keepsPartnerWinning)
    return lowest(legal)
  }

  if (lastToPlay && opponentWinning) {
    const cheap = cheapestWinner(legal, trick, trump, seat)
    if (cheap && mustWinTrick) return cheap
    const offTrump = legal.filter((c) => effectiveSuit(c, trump) !== trump)
    return offTrump.length > 0 ? lowest(offTrump) : lowest(legal)
  }

  if (opponentWinning) {
    const cheap = cheapestWinner(legal, trick, trump, seat)
    if (cheap && mustWinTrick) return cheap
  }

  const winners = legal.filter((c) => wouldWin(c))
  if (winners.length > 0 && opponentWinning && !lastToPlay) {
    if (mustWinTrick) return lowestTrump(winners, trump)
  }

  const offTrump = legal.filter((c) => effectiveSuit(c, trump) !== trump)
  if (offTrump.length > 0) return lowest(offTrump)
  return lowest(legal)
}

const EUCHRE_RANKS = ['9', '10', 'J', 'Q', 'K', 'A'] as const

/** Highest remaining trump power outside my hand (0 if none). */
function highestOutsideTrumpPower(
  hand: Card[],
  trump: Suit,
  playedIds: Set<string>,
): number {
  const mine = new Set(hand.map((c) => c.id))
  let max = 0
  for (const suit of SUITS) {
    for (const rank of EUCHRE_RANKS) {
      const c = makeCard(suit, rank)
      if (mine.has(c.id) || playedIds.has(c.id)) continue
      if (effectiveSuit(c, trump) === trump) {
        max = Math.max(max, cardPower(c, trump))
      }
    }
  }
  return max
}

function choosePlayHard(
  hand: Card[],
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
  const trickGoal = isLoner && onMakerTeam ? 5 : 3
  const tricksNeeded = onMakerTeam ? Math.max(0, trickGoal - makerTricks) : 0
  const defenderTricksNeeded = defending
    ? isLoner
      ? Math.max(0, 3 - defenderTricks)
      : Math.max(0, 1 - defenderTricks)
    : 0
  const mustWinTrick = tricksNeeded > 0 || defenderTricksNeeded > 0
  const marchThreat = defending && makerTricks >= 2
  const partnerSeat = partnerOf(seat)
  const myTrump = trumpCount(hand, trump)
  const leading = trick.length === 0
  const playedIds = ctx?.playedIds ?? new Set<string>()
  const endgame = hand.length <= 2
  const outsideTrumpTop = highestOutsideTrumpPower(hand, trump, playedIds)

  // Endgame force: take cheapest winner when we must win and partner is not already winning
  if (endgame && mustWinTrick && trick.length > 0) {
    const cur = trickWinner(trick, trump)
    if (partnershipOf(cur) !== partnershipOf(seat)) {
      const cheap = cheapestWinner(legal, trick, trump, seat)
      if (cheap) return cheap
    }
  }

  let best = legal[0]
  let bestScore = -Infinity

  for (const card of legal) {
    let score = 0
    const power = cardPower(card, trump)
    const isTrump = effectiveSuit(card, trump) === trump
    const wins =
      trick.length === 0
        ? true // lead: unknown; prefer not to assume
        : trickWinner([...trick, { seat, card }], trump) === seat
    const isMasterTrump = isTrump && power > outsideTrumpTop

    if (leading) {
      // Pull trump when makers/defenders hold depth — priority over cashing aces
      if (isTrump) {
        if ((onMakerTeam || defending) && myTrump >= 2) {
          score += 95 - power * 0.5 // lead low trump to draw
          // Prefer not leading master trump first when drawing
          if (isMasterTrump && myTrump >= 3) score -= 8
        } else if (isRightBower(card, trump) || isLeftBower(card, trump)) {
          score -= 25 // don't open a bower cold
          // Exception: master bower endgame cash
          if (endgame && isMasterTrump && mustWinTrick) score += 80
        } else {
          score += 10 - power * 0.2
        }
      } else {
        const sameOff = hand.filter(
          (h) => effectiveSuit(h, trump) === effectiveSuit(card, trump),
        )
        // Cash off ace — safer late or when trump is drawn down
        if (card.rank === 'A' && sameOff.length === 1) {
          score += myTrump >= 2 ? 12 : 48
          if (endgame || outsideTrumpTop === 0) score += 22
        } else if (card.rank === 'A') {
          score += myTrump >= 2 ? 8 : 28
          if (endgame) score += 18
        }
        score += 18 - sameOff.length * 5
        score += 6 - power * 0.35
      }
      if (hand.length <= 2 && isTrump && power >= 54) score += 20
      if (endgame && isMasterTrump && mustWinTrick) score += 35
    } else {
      const winner = trickWinner(trick, trump)
      const partnerWinning = winner === partnerSeat
      const opponentWinning = partnershipOf(winner) !== partnershipOf(seat)
      const lastToPlay = trick.length === 3 || (isLoner && trick.length === 2)

      if (partnerWinning) {
        // Never overtake partner — dump absolute lowest
        if (wins) score -= 400
        else {
          score += 100
          score -= rankValue(card.rank) * 4
          score -= power * 0.3
          if (isTrump) score -= 40
        }
      } else if (opponentWinning) {
        if (wins) {
          score += mustWinTrick || marchThreat ? 320 : 90
          // Cheapest winner
          score -= power * 0.9
          // Prefer not burning right bower early unless needed
          if (isRightBower(card, trump) && !mustWinTrick && !lastToPlay) score -= 40
          // Master trump is cheap insurance when we must win
          if (isMasterTrump && mustWinTrick) score += 25
          if (lastToPlay) score += 40
          if (endgame && mustWinTrick) score += 50
        } else {
          score -= mustWinTrick ? 60 : 5
          score += 40 - power * 0.6
          if (isTrump) score -= 50 // don't slough trump that loses
        }
      } else {
        // Self currently winning mid-trick (shouldn't happen often mid-eval)
        score += 30 - power * 0.5
        if (isTrump) score -= 25
      }

      // Second hand low: don't climb without need
      if (trick.length === 1 && !mustWinTrick && wins) {
        score -= 35
      }
      // Third hand high when partner led and opp may win
      if (trick.length === 2 && opponentWinning && wins) {
        score += mustWinTrick ? 50 : 20
      }
    }

    // Preserve bowers for control when not finishing the hand
    if (isRightBower(card, trump) && hand.length > 2 && !mustWinTrick) score -= 18
    if (isLeftBower(card, trump) && hand.length > 2 && !mustWinTrick) score -= 10
    // If right bower already gone, left is top — freer to use
    if (isLeftBower(card, trump) && outsideTrumpTop < cardPower(card, trump)) {
      if (mustWinTrick) score += 12
    }

    if (score > bestScore) {
      bestScore = score
      best = card
    }
  }

  return best
}

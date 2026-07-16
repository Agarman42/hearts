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

function highestPower(cards: Card[], trump: Suit): Card {
  return cards.reduce((a, b) => (cardPower(a, trump) > cardPower(b, trump) ? a : b))
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
}

function teamTricksFor(
  team: ReturnType<typeof partnershipOf>,
  tricksWon: Record<Seat, number>,
): number {
  const seats: Seat[] = team === 'ns' ? [0, 2] : [1, 3]
  return seats.reduce<number>((sum, s) => sum + (tricksWon[s] ?? 0), 0)
}

function orderScore(hand: Card[], trump: Suit, upcard?: Card): number {
  let score = trumpCount(hand, trump) * 2
  if (hasBower(hand, trump)) score += 4
  if (upcard && effectiveSuit(upcard, trump) === trump) {
    score += cardPower(upcard, trump) >= 50 ? 3 : 1
  }
  const offAces = hand.filter(
    (c) => c.rank === 'A' && effectiveSuit(c, trump) !== trump,
  ).length
  score += offAces
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
    if (bidderSeat === dealerSeat) return hasBower(hand, trump) ? 2 : 0
    return hasBower(hand, trump) ? 1 : 0
  }
  let penalty = -7
  if (upcard && effectiveSuit(upcard, trump) === trump) {
    const power = cardPower(upcard, trump)
    if (power >= 99) penalty -= 3
    else if (power >= 50) penalty -= 2
    else penalty -= 1
  }
  const wouldHelpThem = trumpCount(hand, trump) <= 1 && !hasBower(hand, trump)
  if (wouldHelpThem) penalty -= 2
  return penalty
}

function orderThreshold(difficulty: AiDifficulty): number {
  return difficulty === 'hard' ? 10 : difficulty === 'medium' ? 12 : 14
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
    if (difficulty !== 'easy' && next === suit) score += 1
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

  if (difficulty === 'hard') {
    return bothBowers || (count >= 4 && bower) || (count >= 5 && hasBower(hand, trump))
  }
  if (difficulty === 'medium') {
    return (count >= 4 && bower) || (bothBowers && count >= 4 && rng() < 0.75)
  }
  return count >= 4 && bower && rng() < 0.35
}

export function chooseDiscard(hand: Card[], trump: Suit): Card {
  const groups = suitGroups(hand, trump)
  const offTrump = [...groups.entries()].filter(([suit]) => suit !== trump)

  if (offTrump.length > 0) {
    const shortest = offTrump.sort((a, b) => a[1].length - b[1].length)[0]
    const [, cards] = shortest
    return cards.reduce((a, b) => (cardPower(a, trump) > cardPower(b, trump) ? a : b))
  }

  return lowestTrump(hand, trump)
}

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
  const defenderTricksNeeded =
    defending && isLoner ? Math.max(0, 3 - defenderTricks) : defending ? 1 : 0
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

    if (difficulty === 'hard' && offTrump.length > 0) {
      const singletonAce = offTrump.find((c) => {
        const same = hand.filter((h) => h.suit === c.suit && effectiveSuit(h, trump) !== trump)
        return c.rank === 'A' && same.length === 1
      })
      if (singletonAce) return singletonAce
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

    if (trumpCards.length > 0 && difficulty === 'hard') {
      return highestPower(trumpCards, trump)
    }
    return lowestTrump(legal, trump)
  }

  const winner = trickWinner(trick, trump)
  const partnerSeat = partnerOf(seat)
  const partnerWinning = partnerSeat === winner
  const opponentWinning = partnershipOf(winner) !== partnershipOf(seat)
  const lastToPlay = trick.length === 3
  const selfWinning = !partnerWinning && !opponentWinning

  if (partnerWinning) {
    const keepsPartnerWinning = legal.filter(
      (c) => trickWinner([...trick, { seat, card: c }], trump) === partnerSeat,
    )
    if (keepsPartnerWinning.length > 0) return lowest(keepsPartnerWinning)
    return lowest(legal)
  }

  if (selfWinning) {
    const offTrump = legal.filter((c) => effectiveSuit(c, trump) !== trump)
    if (offTrump.length > 0) return lowest(offTrump)
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
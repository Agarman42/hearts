import { Card, Seat } from '../../core/types'
import type { Suit } from '../../core/types'
import type { AiDifficulty } from '../../core/types'
import { rankValue } from '../../core/cards'
import { partnerOf, partnershipOf } from '../../core/partnership'
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

export function chooseOrderUp(
  hand: Card[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  upcard?: Card,
): boolean {
  const score = orderScore(hand, trump, upcard)
  const threshold = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 7 : 9
  if (score >= threshold) return true
  if (difficulty === 'easy') return rng() < 0.12
  return score >= 4 && rng() < 0.4
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
    let score = orderScore(hand, suit)
    if (difficulty !== 'easy' && next === suit) score += 2
    if (score > bestScore) {
      bestScore = score
      best = suit
    }
  }

  const threshold = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 7 : 9
  if (best && bestScore >= threshold) return best
  if (difficulty === 'easy' && rng() < 0.1 && best) return best
  if (difficulty === 'medium' && best && bestScore >= 5 && rng() < 0.35) return best
  return null
}

export function chooseGoAlone(
  hand: Card[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
): boolean {
  const count = trumpCount(hand, trump)
  const bower = hasBower(hand, trump)
  const bothBowers =
    hand.some((c) => isRightBower(c, trump)) &&
    hand.some((c) => isLeftBower(c, trump))

  if (difficulty === 'hard') {
    return bothBowers || (count >= 4 && bower) || (count >= 5 && hasBower(hand, trump))
  }
  if (difficulty === 'medium') {
    return (count >= 4 && bower) || (bothBowers && rng() < 0.85)
  }
  return count >= 4 && bower && rng() < 0.4
}

export function chooseDiscard(hand: Card[], trump: Suit): Card {
  const groups = suitGroups(hand, trump)
  let worst: Card | null = null
  let worstScore = Infinity

  for (const [suit, cards] of groups) {
    if (suit === trump) continue
    for (const c of cards) {
      const isolated = cards.length === 1 ? 0 : 10
      const score = cardPower(c, trump) + isolated + (c.rank === 'A' && cards.length === 1 ? -5 : 0)
      if (score < worstScore) {
        worstScore = score
        worst = c
      }
    }
  }

  if (worst) return worst
  return lowestTrump(hand, trump)
}

export function choosePlay(
  hand: Card[],
  trick: TrickPlay[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  seat: Seat = 0,
  ctx?: EuchrePlayContext,
): Card {
  const legal = legalMoves(hand, trick, trump)
  if (legal.length === 1) return legal[0]

  const wouldWin = (card: Card) =>
    trickWinner([...trick, { seat, card }], trump) === seat

  const maker = ctx?.maker ?? null
  const onMakerTeam = maker != null && partnershipOf(seat) === partnershipOf(maker)

  if (trick.length === 0) {
    const trumpCards = legal.filter((c) => effectiveSuit(c, trump) === trump)
    const offTrump = legal.filter((c) => effectiveSuit(c, trump) !== trump)

    if (onMakerTeam && trumpCards.length > 0 && difficulty !== 'easy') {
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
  const partnerWinning = partnerOf(seat) === winner
  const opponentWinning = partnershipOf(winner) !== partnershipOf(seat)

  if (partnerWinning) {
    const safe = legal.filter((c) => !wouldWin(c))
    return safe.length > 0 ? lowest(safe) : lowest(legal)
  }

  if (opponentWinning && difficulty !== 'easy') {
    const cheap = cheapestWinner(legal, trick, trump, seat)
    if (cheap) return cheap
  }

  const winners = legal.filter((c) => wouldWin(c))
  if (winners.length > 0 && difficulty !== 'easy' && opponentWinning) {
    return lowestTrump(winners, trump)
  }
  if (difficulty === 'easy' && rng() < 0.28 && winners.length > 0) {
    return highestPower(winners, trump)
  }

  const trumpSlough = legal.filter((c) => effectiveSuit(c, trump) === trump)
  if (!opponentWinning && trumpSlough.length > 0 && partnerWinning === false) {
    return lowestTrump(trumpSlough, trump)
  }

  return lowest(legal)
}
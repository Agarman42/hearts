import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import type { AiDifficulty } from '../../core/types'
import { rankValue } from '../../core/cards'
import { partnerOf } from '../../core/partnership'
import type { TrickPlay } from '../types'
import { cardPower, effectiveSuit, legalMoves, trickWinner } from './rules'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

function trumpCount(hand: Card[], trump: Suit): number {
  return hand.filter((c) => effectiveSuit(c, trump) === trump).length
}

function lowest(cards: Card[]): Card {
  return cards.reduce((a, b) => (rankValue(a.rank) < rankValue(b.rank) ? a : b))
}

function highestPower(cards: Card[], trump: Suit): Card {
  return cards.reduce((a, b) => (cardPower(a, trump) > cardPower(b, trump) ? a : b))
}

export function chooseOrderUp(
  hand: Card[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
): boolean {
  const count = trumpCount(hand, trump)
  const threshold = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 3 : 4
  if (count >= threshold) return true
  if (difficulty === 'easy') return rng() < 0.15
  return count >= 2 && rng() < 0.35
}

export function chooseTrumpSuit(
  hand: Card[],
  turnedDown: Suit | null,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
): Suit | null {
  const options = SUITS.filter((s) => s !== turnedDown)
  let best: Suit | null = null
  let bestCount = 0
  for (const suit of options) {
    const c = trumpCount(hand, suit)
    if (c > bestCount) {
      bestCount = c
      best = suit
    }
  }
  const threshold = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 3 : 4
  if (best && bestCount >= threshold) return best
  if (difficulty === 'easy' && rng() < 0.12 && best) return best
  return null
}

export function chooseDiscard(hand: Card[], trump: Suit): Card {
  const nonTrump = hand.filter((c) => effectiveSuit(c, trump) !== trump)
  return lowest(nonTrump.length > 0 ? nonTrump : hand)
}

export function choosePlay(
  hand: Card[],
  trick: TrickPlay[],
  trump: Suit,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
  seat: import('../../core/types').Seat = 0,
): Card {
  const legal = legalMoves(hand, trick, trump)
  if (legal.length === 1) return legal[0]

  const wouldWin = (card: Card) =>
    trickWinner([...trick, { seat, card }], trump) === seat

  if (trick.length === 0) {
    const trumpCards = legal.filter((c) => effectiveSuit(c, trump) === trump)
    if (trumpCards.length > 0 && difficulty !== 'easy') {
      return highestPower(trumpCards, trump)
    }
    return highestPower(legal, trump)
  }

  const winner = trick.length > 0 ? trickWinner(trick, trump) : null
  const partnerWinning = winner != null && partnerOf(seat) === winner

  if (partnerWinning) {
    const safe = legal.filter((c) => !wouldWin(c))
    return safe.length > 0 ? lowest(safe) : lowest(legal)
  }

  const winners = legal.filter((c) => wouldWin(c))
  if (winners.length > 0 && difficulty !== 'easy') {
    return highestPower(winners, trump)
  }
  if (difficulty === 'easy' && rng() < 0.3 && winners.length > 0) {
    return highestPower(winners, trump)
  }
  return lowest(legal)
}
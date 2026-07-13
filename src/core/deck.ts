import { Card, RANKS, SUITS } from './types'
import { makeCard } from './cards'

export type DeckKind = 'standard52' | 'euchre24'

const EUCHRE_RANKS = ['9', '10', 'J', 'Q', 'K', 'A'] as const

export function createDeck(kind: DeckKind = 'standard52'): Card[] {
  if (kind === 'euchre24') {
    const deck: Card[] = []
    for (const suit of SUITS) {
      for (const rank of EUCHRE_RANKS) {
        deck.push(makeCard(suit, rank))
      }
    }
    return deck
  }
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(suit, rank))
    }
  }
  return deck
}

/** @deprecated Use createDeck('standard52') */
export function createFullDeck(): Card[] {
  return createDeck('standard52')
}

/** Fisher–Yates shuffle (in place). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function deal(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  deck.forEach((card, i) => {
    hands[i % playerCount].push(card)
  })
  return hands
}

export function freshShuffledDeck(rng?: () => number, kind: DeckKind = 'standard52'): Card[] {
  return shuffle(createDeck(kind), rng)
}
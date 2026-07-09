import { Card } from './types'
import { createFullDeck } from './cards'

/** Fisher–Yates shuffle (in place). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function deal(
  deck: Card[],
  playerCount: number,
): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  deck.forEach((card, i) => {
    hands[i % playerCount].push(card)
  })
  return hands
}

export function freshShuffledDeck(rng?: () => number): Card[] {
  return shuffle(createFullDeck(), rng)
}

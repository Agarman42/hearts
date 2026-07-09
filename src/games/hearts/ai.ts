import { Card, Seat, AiDifficulty } from '../../core/types'
import {
  heartsPenalty,
  isHeart,
  isQueenOfSpades,
  rankValue,
  sortHand,
} from '../../core/cards'
import { legalMoves } from './rules'
import { GameRulesConfig, TrickPlay } from '../types'

function pickRandom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function highest(cards: Card[]): Card {
  return cards.reduce((a, b) => (rankValue(a.rank) >= rankValue(b.rank) ? a : b))
}

function lowest(cards: Card[]): Card {
  return cards.reduce((a, b) => (rankValue(a.rank) <= rankValue(b.rank) ? a : b))
}

function safeBelow(cards: Card[], maxRank: number): Card[] {
  return cards.filter((c) => rankValue(c.rank) < maxRank)
}

function currentTrickHigh(trick: TrickPlay[]): number {
  if (trick.length === 0) return 0
  const lead = trick[0].card.suit
  return Math.max(
    ...trick.filter((p) => p.card.suit === lead).map((p) => rankValue(p.card.rank)),
  )
}

function trickHasPoints(trick: TrickPlay[]): boolean {
  return trick.some((p) => heartsPenalty(p.card) > 0)
}

/** Choose 3 cards to pass. */
export function choosePassCards(
  hand: Card[],
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
): Card[] {
  const sorted = sortHand(hand)
  if (difficulty === 'easy') {
    return pickRandomSubset(sorted, 3, rng)
  }

  // Prefer dumping Q♠, A♠, K♠, high hearts, A♦/A♣
  const score = (c: Card): number => {
    if (isQueenOfSpades(c)) return 100
    if (c.suit === 'spades' && (c.rank === 'A' || c.rank === 'K')) return 90
    if (isHeart(c) && rankValue(c.rank) >= 12) return 70 + rankValue(c.rank)
    if (c.rank === 'A') return 55
    if (c.rank === 'K') return 45
    if (isHeart(c)) return 30 + rankValue(c.rank)
    return rankValue(c.rank)
  }

  const ranked = [...sorted].sort((a, b) => score(b) - score(a))
  if (difficulty === 'hard') {
    // Keep low spades as Q♠ cover when holding Q♠
    const hasQ = ranked.some(isQueenOfSpades)
    if (hasQ) {
      const keepSpades = sorted.filter(
        (c) => c.suit === 'spades' && !isQueenOfSpades(c) && rankValue(c.rank) <= 10,
      )
      const candidates = ranked.filter(
        (c) => !keepSpades.slice(0, 2).some((k) => k.id === c.id),
      )
      return candidates.slice(0, 3)
    }
  }
  return ranked.slice(0, 3)
}

function pickRandomSubset(cards: Card[], n: number, rng: () => number): Card[] {
  const copy = [...cards]
  const out: Card[] = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

export function choosePlay(
  hand: Card[],
  trick: TrickPlay[],
  heartsBroken: boolean,
  isFirstTrick: boolean,
  rules: GameRulesConfig,
  difficulty: AiDifficulty,
  rng: () => number = Math.random,
): Card {
  const legal = legalMoves(hand, trick, heartsBroken, isFirstTrick, rules)
  if (legal.length === 1) return legal[0]

  if (difficulty === 'easy') {
    return pickRandom(legal, rng)
  }

  const leading = trick.length === 0
  const voiding = trick.length > 0 && !legal.every((c) => c.suit === trick[0].card.suit)

  if (leading) {
    // Prefer low non-point cards
    const nonPoints = legal.filter((c) => heartsPenalty(c) === 0)
    const pool = nonPoints.length ? nonPoints : legal
    if (difficulty === 'hard') {
      // Lead low from longest non-heart suit ideally
      const bySuit = groupBySuit(pool)
      const suitOrder = Object.entries(bySuit).sort((a, b) => b[1].length - a[1].length)
      return lowest(suitOrder[0][1])
    }
    return lowest(pool)
  }

  const high = currentTrickHigh(trick)
  const points = trickHasPoints(trick)
  const lastToPlay = trick.length === 3

  if (!voiding) {
    // Following suit
    const canDuck = safeBelow(legal, high)
    if (canDuck.length > 0 && (points || !lastToPlay || difficulty === 'hard')) {
      return difficulty === 'hard' ? highest(canDuck) : lowest(canDuck)
    }
    // Must take or want to take
    if (lastToPlay && !points) {
      return highest(legal) // free high dump
    }
    // Avoid taking points if possible — play lowest that still takes only if needed
    if (points) {
      return lowest(legal)
    }
    return difficulty === 'hard' ? highest(legal) : lowest(legal)
  }

  // Void — dump dangerous cards carefully
  const q = legal.find(isQueenOfSpades)
  if (q) {
    // Hard: only unload Q♠ when the trick already has points, you're last,
    // or you have nothing safer (don't "gift" the Queen early).
    if (difficulty === 'hard') {
      const safer = legal.filter((c) => !isQueenOfSpades(c) && heartsPenalty(c) === 0)
      if (points || lastToPlay || safer.length === 0) return q
    } else if (points || lastToPlay || rng() > 0.25) {
      return q
    }
  }

  const highHearts = legal.filter((c) => isHeart(c) && rankValue(c.rank) >= 11)
  if (highHearts.length && (points || lastToPlay || difficulty !== 'hard')) {
    return highest(highHearts)
  }
  const hearts = legal.filter(isHeart)
  if (hearts.length && (points || difficulty === 'medium' || lastToPlay)) {
    return highest(hearts)
  }

  // Hard: dump A/K of spades when void (Q♠ magnets), then high of longest junk
  const highSpades = legal.filter(
    (c) => c.suit === 'spades' && (c.rank === 'A' || c.rank === 'K'),
  )
  if (highSpades.length) return highest(highSpades)

  if (difficulty === 'hard') {
    const nonPoints = legal.filter((c) => heartsPenalty(c) === 0)
    const dumpPool = nonPoints.length ? nonPoints : legal
    return highest(dumpPool)
  }

  return highest(legal)
}

function groupBySuit(cards: Card[]): Record<string, Card[]> {
  const g: Record<string, Card[]> = {}
  for (const c of cards) {
    ;(g[c.suit] ||= []).push(c)
  }
  return g
}

export function defaultAiNames(): Record<Seat, string> {
  return {
    0: 'You',
    1: 'Angie',
    2: 'Scott',
    3: 'Heather',
  }
}

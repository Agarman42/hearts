import { Card, Seat, AiDifficulty } from '../../core/types'
import {
  heartsPenalty,
  isHeart,
  isQueenOfSpades,
  rankValue,
  sortHand,
} from '../../core/cards'
import { legalMoves, trickWinner } from './rules'
import { GameRulesConfig, TrickPlay } from '../types'

export interface AiPlayContext {
  /** Points this seat has taken so far this hand */
  myPoints: number
  /** Max points any other seat has this hand */
  maxOppPoints: number
  /** Hearts still not taken this hand (approx 13 - total hearts taken) */
  heartsLeftInPlay: number
  /** Hand points per seat — used to spot moon threats / feed the leader */
  handPointsBySeat?: Partial<Record<Seat, number>>
  /** Who is playing this card */
  seat?: Seat
}

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

function trickHasQueen(trick: TrickPlay[]): boolean {
  return trick.some((p) => isQueenOfSpades(p.card))
}

function currentTrickWinner(trick: TrickPlay[]): Seat | null {
  if (trick.length === 0) return null
  return trickWinner(trick)
}

function wouldWinTrick(card: Card, trick: TrickPlay[], seat: Seat): boolean {
  return trickWinner([...trick, { seat, card }]) === seat
}

/** Seat with the most hand points among opponents. */
function moonThreatSeat(ctx: AiPlayContext, mySeat: Seat): Seat | null {
  const map = ctx.handPointsBySeat
  if (!map) return null
  let best: Seat | null = null
  let bestPts = 0
  for (const s of [0, 1, 2, 3] as Seat[]) {
    if (s === mySeat) continue
    const pts = map[s] ?? 0
    if (pts > bestPts) {
      bestPts = pts
      best = s
    }
  }
  return bestPts >= 14 ? best : null
}

function lowestPointCard(cards: Card[]): Card {
  return cards.reduce((a, b) =>
    heartsPenalty(a) <= heartsPenalty(b) ? a : b,
  )
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
    const hasQ = ranked.some(isQueenOfSpades)
    if (hasQ) {
      // Keep low spade cover when holding Q♠; dump Q only if no cover
      const cover = sorted.filter(
        (c) => c.suit === 'spades' && !isQueenOfSpades(c) && rankValue(c.rank) <= 10,
      )
      if (cover.length >= 2) {
        // Keep Q and two cover; dump other dangers
        const candidates = ranked.filter(
          (c) =>
            !isQueenOfSpades(c) &&
            !cover.slice(0, 2).some((k) => k.id === c.id),
        )
        return candidates.slice(0, 3)
      }
      // No cover — get rid of Q and high hearts
      return ranked.slice(0, 3)
    }
    // No Q: strip high spades + high hearts aggressively
    return ranked.slice(0, 3)
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
  ctx?: AiPlayContext,
): Card {
  const legal = legalMoves(hand, trick, heartsBroken, isFirstTrick, rules)
  if (legal.length === 1) return legal[0]

  if (difficulty === 'easy') {
    return pickRandom(legal, rng)
  }

  const leading = trick.length === 0
  const voiding = trick.length > 0 && !legal.every((c) => c.suit === trick[0].card.suit)
  const hard = difficulty === 'hard'
  const mySeat = ctx?.seat ?? (0 as Seat)
  const myPts = ctx?.myPoints ?? 0
  const maxOpp = ctx?.maxOppPoints ?? 0
  const threatSeat = moonThreatSeat(ctx ?? { myPoints: 0, maxOppPoints: 0, heartsLeftInPlay: 0 }, mySeat)
  // Attempting moon: already have a chunk of points and no one else is close
  const shootingMoon =
    hard &&
    myPts >= 10 &&
    maxOpp <= 3 &&
    myPts + (ctx?.heartsLeftInPlay ?? 0) + 13 >= 24
  // Stop someone else's moon
  const stopMoon = hard && maxOpp >= 14 && myPts < maxOpp

  if (leading) {
    const nonPoints = legal.filter((c) => heartsPenalty(c) === 0)
    const pool = nonPoints.length ? nonPoints : legal
    if (hard || difficulty === 'medium') {
      if (hard && shootingMoon) {
        const pointCards = legal.filter((c) => heartsPenalty(c) > 0)
        if (pointCards.length) return highest(pointCards)
      }
      const bySuit = groupBySuit(pool)
      const suitOrder = Object.entries(bySuit).sort((a, b) => b[1].length - a[1].length)
      const hasQ = hand.some(isQueenOfSpades)
      if (hasQ) {
        const nonSpade = suitOrder.filter(([s]) => s !== 'spades')
        if (nonSpade.length) return lowest(nonSpade[0][1])
      }
      return lowest(suitOrder[0]?.[1] ?? pool)
    }
    return lowest(pool)
  }

  const high = currentTrickHigh(trick)
  const points = trickHasPoints(trick)
  const queenOut = trickHasQueen(trick)
  const lastToPlay = trick.length === 3

  if (!voiding) {
    const canDuck = safeBelow(legal, high)
    if (canDuck.length > 0) {
      // Always duck under the Queen if we can
      if (queenOut || points || !lastToPlay || hard) {
        if (hard && shootingMoon && !queenOut && lastToPlay) {
          // Take non-queen points when mooning
          return highest(legal)
        }
        // Hard: duck with highest safe card (preserve lows)
        return hard ? highest(canDuck) : lowest(canDuck)
      }
    }
    if (lastToPlay && !points) {
      return highest(legal)
    }
    if (points || queenOut) {
      const trickWinnerSeat = currentTrickWinner(trick)
      if (hard && stopMoon && threatSeat != null && trickWinnerSeat === threatSeat) {
        return highest(legal)
      }
      const pointCards = legal.filter((c) => heartsPenalty(c) > 0)
      if (pointCards.length) return lowestPointCard(pointCards)
      return lowest(legal)
    }
    if (hard && shootingMoon) return highest(legal)
    // Don't grab cheap tricks early with face cards
    const cheapWin = legal.filter(
      (c) => !wouldWinTrick(c, trick, mySeat) || lastToPlay,
    )
    if (cheapWin.length) return hard ? highest(cheapWin) : lowest(cheapWin)
    return hard ? highest(legal) : lowest(legal)
  }

  // Void — dump carefully
  const q = legal.find(isQueenOfSpades)
  if (q) {
    if (hard) {
      const safer = legal.filter((c) => !isQueenOfSpades(c) && heartsPenalty(c) === 0)
      // Unload Q on point tricks, last seat, or no safe exit
      if (points || queenOut || lastToPlay || safer.length === 0) return q
      // Never gift Q early on a clean void
    } else if (points || lastToPlay || rng() > 0.25) {
      return q
    }
  }

  if (hard && stopMoon && threatSeat != null) {
    const trickWinnerSeat = currentTrickWinner(trick)
    const hearts = legal.filter(isHeart)
    if (hearts.length && !lastToPlay) {
      if (trickWinnerSeat != null && trickWinnerSeat !== threatSeat) {
        return highest(hearts)
      }
      if (trickWinnerSeat === threatSeat) {
        const safe = legal.filter((c) => !isHeart(c) && heartsPenalty(c) === 0)
        if (safe.length) return highest(safe)
      }
    }
  }

  if (hard && shootingMoon) {
    const takeable = legal.filter((c) => heartsPenalty(c) > 0)
    if (takeable.length && (points || lastToPlay)) return highest(takeable)
  }

  const shouldDumpPoints = points || queenOut || lastToPlay

  const highHearts = legal.filter((c) => isHeart(c) && rankValue(c.rank) >= 11)
  if (highHearts.length && shouldDumpPoints) {
    return highest(highHearts)
  }
  const hearts = legal.filter(isHeart)
  if (hearts.length && shouldDumpPoints) {
    return highest(hearts)
  }

  const highSpades = legal.filter(
    (c) => c.suit === 'spades' && (c.rank === 'A' || c.rank === 'K'),
  )
  if (highSpades.length) return highest(highSpades)

  const safeVoid = legal.filter((c) => heartsPenalty(c) === 0)
  if (safeVoid.length) return highest(safeVoid)

  if (hard) return highest(legal)

  return lowestPointCard(legal)
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

import { Card, Seat, AiDifficulty } from '../../core/types'
import { rankValue } from '../../core/cards'
import { sortHeartsHand } from './hand'
import { heartsPenalty, isHeart, isQueenOfSpades } from './scoring'
import { legalMoves, trickWinner } from './rules'
import type { HeartsRulesConfig } from './types'
import { TrickPlay } from '../types'

export interface AiPlayContext {
  /** Points this seat has taken so far this hand */
  myPoints: number
  /** Max points any other seat has this hand */
  maxOppPoints: number
  /** Hearts still not taken this hand (approx 13 - total hearts taken) */
  heartsLeftInPlay: number
  /** Hand points per seat — used to spot moon threats / feed the leader */
  handPointsBySeat?: Partial<Record<Seat, number>>
  /** Match totals per seat */
  totalScores?: Partial<Record<Seat, number>>
  /** Highest match total among all seats */
  leaderTotal?: number
  /** This seat's match total */
  myTotal?: number
  /** Race-to target */
  raceTo?: number
  /** Current trick leader seat */
  trickLeader?: Seat | null
  /** Completed tricks this hand */
  completedTricks?: number
  /** Suits each seat has shown this hand */
  suitsSeenBySeat?: Partial<Record<Seat, Set<string>>>
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
  return bestPts >= 12 ? best : null
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
  const sorted = sortHeartsHand(hand)
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

  // Void shortest suit — pass low cards to build a long suit
  const bySuit = groupBySuit(sorted)
  const suitLengths = Object.entries(bySuit).sort((a, b) => a[1].length - b[1].length)
  const shortSuit = suitLengths[0]
  const voidCandidates =
    shortSuit && shortSuit[1].length <= 3
      ? [...shortSuit[1]].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))
      : []

  if (difficulty === 'hard') {
    const heartCount = sorted.filter(isHeart).length
    if (heartCount >= 5) {
      const nonHearts = ranked.filter((c) => !isHeart(c))
      const heartDump = ranked.filter(isHeart).slice(0, 1)
      const picks = [...nonHearts.slice(0, 3 - heartDump.length), ...heartDump].slice(0, 3)
      if (picks.length === 3) return picks
    }
    const hasQ = ranked.some(isQueenOfSpades)
    if (hasQ) {
      const cover = sorted
        .filter(
          (c) =>
            c.suit === 'spades' && !isQueenOfSpades(c) && rankValue(c.rank) <= 10,
        )
        .sort((a, b) => rankValue(a.rank) - rankValue(b.rank))
      if (cover.length >= 2) {
        const keep = new Set([...cover.slice(0, 2).map((c) => c.id), 'Q♠'])
        const candidates = ranked.filter((c) => !keep.has(c.id))
        const picks = candidates.slice(0, 3)
        if (picks.length === 3) return picks
      }
      return ranked.slice(0, 3)
    }
    if (voidCandidates.length >= 3) return voidCandidates.slice(0, 3)
    return ranked.slice(0, 3)
  }

  if (voidCandidates.length >= 3 && difficulty === 'medium') {
    const danger = ranked.filter((c) => score(c) >= 45)
    const mixed = [...danger.slice(0, 2), voidCandidates[0]].slice(0, 3)
    if (mixed.length === 3) return mixed
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
  rules: HeartsRulesConfig,
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
  const pointCardsInHand = hand.filter((c) => heartsPenalty(c) > 0).length
  const moonFeasible =
    pointCardsInHand + myPts + (ctx?.heartsLeftInPlay ?? 0) >= 22
  // Attempting moon: already have a chunk of points and no one else is close
  const shootingMoon =
    hard &&
    moonFeasible &&
    myPts >= 10 &&
    maxOpp <= 3 &&
    myPts + (ctx?.heartsLeftInPlay ?? 0) + 13 >= 24
  // Stop someone else's moon (medium at higher threshold)
  const stopMoon =
    (hard && maxOpp >= 12 && myPts < maxOpp) ||
    (difficulty === 'medium' && maxOpp >= 15 && myPts < maxOpp)
  const behindInMatch =
    (ctx?.myTotal ?? 0) > (ctx?.leaderTotal ?? 0) - 15 &&
    (ctx?.leaderTotal ?? 0) >= (ctx?.raceTo ?? 100) - 25

  if (leading) {
    if (isFirstTrick) {
      const twoClubs = legal.find((c) => c.suit === 'clubs' && c.rank === '2')
      if (twoClubs) return twoClubs
    }
    const nonPoints = legal.filter((c) => heartsPenalty(c) === 0)
    const nonHearts = legal.filter((c) => !isHeart(c))
    const pool =
      heartsBroken && !shootingMoon && nonHearts.length > 0
        ? nonHearts
        : nonPoints.length
          ? nonPoints
          : legal
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
    const trickWinnerSeat = currentTrickWinner(trick)
    if (hard && stopMoon && threatSeat != null && trickWinnerSeat === threatSeat) {
      const winners = legal.filter((c) => wouldWinTrick(c, trick, mySeat))
      if (winners.length > 0) return highest(winners)
    }

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
    if (lastToPlay && !points && !queenOut) {
      const winners = legal.filter((c) => wouldWinTrick(c, trick, mySeat))
      if (winners.length > 0 && !hard) return lowest(winners)
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
    } else if (points || lastToPlay) {
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
  if (safeVoid.length) {
    // When behind in the match, slingshot points onto the leader when possible
    if (behindInMatch && points) {
      const leaderSeat = leaderSeatByTotal(ctx)
      const trickWinnerSeat = currentTrickWinner(trick)
      if (leaderSeat != null && trickWinnerSeat === leaderSeat) {
        const dump = legal.filter((c) => heartsPenalty(c) > 0)
        if (dump.length) return highest(dump)
      }
    }
    return highest(safeVoid)
  }

  if (hard) return highest(legal)

  return lowestPointCard(legal)
}

function leaderSeatByTotal(ctx?: AiPlayContext): Seat | null {
  const map = ctx?.totalScores
  if (!map) return null
  let best: Seat | null = null
  let bestScore = -1
  for (const s of [0, 1, 2, 3] as Seat[]) {
    const v = map[s] ?? 0
    if (v > bestScore) {
      bestScore = v
      best = s
    }
  }
  return best
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

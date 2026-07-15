/** Career stats persisted in localStorage — namespaced per game. */

import type { GameId } from './games/registry'
import { LEGACY_KEYS, statsKey } from './storageKeys'

export interface MatchRecord {
  at: number
  won: boolean
  yourScore: number
  winnerScore: number
  handsInMatch: number
  moonsShot: number
  cleanHands: number
}

export interface CareerStats {
  matchesPlayed: number
  matchesWon: number
  handsPlayed: number
  moonsShot: number
  moonsAgainst: number
  queensTaken: number
  /** Consecutive hands without taking Q♠ (Hearts) */
  queenFreeStreak: number
  handsWithZero: number
  /** Hands with 1–5 points */
  handsUnderFive: number
  /** Hands where you took 20+ */
  handsHeavy: number
  winStreak: number
  bestWinStreak: number
  bestWinScore: number | null
  worstLossScore: number | null
  pointsTaken: number
  /** Best single-hand score (lowest is best in Hearts) */
  bestHandScore: number | null
  /** Worst single-hand score */
  worstHandScore: number | null
  /** Total tricks won (approx via hand wins — tracked per hand zero/heavy as proxy) */
  recentMatches: MatchRecord[]
  /** Spades — successful nil bids (you) */
  nilMade: number
  /** Spades — failed nil bids (you) */
  nilFailed: number
  /** Spades — successful blind nil bids (you) */
  blindNilMade: number
  /** Spades — team contracts made */
  teamBidsMade: number
  /** Spades — team contracts set */
  teamBidsSet: number
  /** Spades — hands where your team took a bag penalty */
  bagPenalties: number
  /** Euchre — your orders that made the point (3+ tricks) */
  ordersMade: number
  /** Euchre — your orders that failed (euchred) */
  ordersFailed: number
  /** Euchre — euchres you earned as defender */
  euchresMade: number
  /** Euchre — marches as makers (your team) */
  marchesMade: number
  /** Euchre — loner hands you called that scored */
  lonersMade: number
}

export const EMPTY_STATS: CareerStats = {
  matchesPlayed: 0,
  matchesWon: 0,
  handsPlayed: 0,
  moonsShot: 0,
  moonsAgainst: 0,
  queensTaken: 0,
  queenFreeStreak: 0,
  handsWithZero: 0,
  handsUnderFive: 0,
  handsHeavy: 0,
  winStreak: 0,
  bestWinStreak: 0,
  bestWinScore: null,
  worstLossScore: null,
  pointsTaken: 0,
  bestHandScore: null,
  worstHandScore: null,
  recentMatches: [],
  nilMade: 0,
  nilFailed: 0,
  blindNilMade: 0,
  teamBidsMade: 0,
  teamBidsSet: 0,
  bagPenalties: 0,
  ordersMade: 0,
  ordersFailed: 0,
  euchresMade: 0,
  marchesMade: 0,
  lonersMade: 0,
}

const MAX_RECENT = 25

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
}

function migrateLegacyStats(): CareerStats | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEYS.stats)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<CareerStats>
    return normalizeStats(p)
  } catch {
    return null
  }
}

function normalizeStats(p: Partial<CareerStats>): CareerStats {
  return {
    matchesPlayed: num(p.matchesPlayed),
    matchesWon: num(p.matchesWon),
    handsPlayed: num(p.handsPlayed),
    moonsShot: num(p.moonsShot),
    moonsAgainst: num(p.moonsAgainst),
    queensTaken: num(p.queensTaken),
    queenFreeStreak: num(p.queenFreeStreak),
    handsWithZero: num(p.handsWithZero),
    handsUnderFive: num(p.handsUnderFive),
    handsHeavy: num(p.handsHeavy),
    winStreak: num(p.winStreak),
    bestWinStreak: num(p.bestWinStreak),
    bestWinScore:
      typeof p.bestWinScore === 'number' && Number.isFinite(p.bestWinScore)
        ? p.bestWinScore
        : null,
    worstLossScore:
      typeof p.worstLossScore === 'number' && Number.isFinite(p.worstLossScore)
        ? p.worstLossScore
        : null,
    pointsTaken: num(p.pointsTaken),
    bestHandScore:
      typeof p.bestHandScore === 'number' && Number.isFinite(p.bestHandScore)
        ? p.bestHandScore
        : null,
    worstHandScore:
      typeof p.worstHandScore === 'number' && Number.isFinite(p.worstHandScore)
        ? p.worstHandScore
        : null,
    recentMatches: Array.isArray(p.recentMatches)
      ? p.recentMatches.slice(0, MAX_RECENT).filter(
          (m) => m && typeof m.at === 'number' && typeof m.won === 'boolean',
        )
      : [],
    nilMade: num(p.nilMade),
    nilFailed: num(p.nilFailed),
    blindNilMade: num(p.blindNilMade),
    teamBidsMade: num(p.teamBidsMade),
    teamBidsSet: num(p.teamBidsSet),
    bagPenalties: num(p.bagPenalties),
    ordersMade: num(p.ordersMade),
    ordersFailed: num(p.ordersFailed),
    euchresMade: num(p.euchresMade),
    marchesMade: num(p.marchesMade),
    lonersMade: num(p.lonersMade),
  }
}

export function loadStats(gameId: GameId = 'hearts'): CareerStats {
  try {
    const key = statsKey(gameId)
    const raw = localStorage.getItem(key)
    if (!raw && gameId === 'hearts') {
      const migrated = migrateLegacyStats()
      if (migrated) {
        saveStats(migrated, gameId)
        return migrated
      }
    }
    if (!raw) return { ...EMPTY_STATS, recentMatches: [] }
    return normalizeStats(JSON.parse(raw) as Partial<CareerStats>)
  } catch {
    return { ...EMPTY_STATS, recentMatches: [] }
  }
}

export function saveStats(stats: CareerStats, gameId: GameId = 'hearts'): void {
  try {
    localStorage.setItem(statsKey(gameId), JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

export function recordHandEnd(
  opts: {
    humanPoints: number
    humanTookQueen: boolean
    moonShooter: 0 | 1 | 2 | 3 | null
  },
  gameId: GameId = 'hearts',
): CareerStats {
  const s = loadStats(gameId)
  s.handsPlayed += 1
  if (gameId === 'spades' || gameId === 'euchre') {
    saveStats(s, gameId)
    return s
  }
  s.pointsTaken += opts.humanPoints
  if (opts.humanPoints === 0) s.handsWithZero += 1
  if (opts.humanPoints > 0 && opts.humanPoints <= 5) s.handsUnderFive += 1
  if (opts.humanPoints >= 20) s.handsHeavy += 1
  if (opts.humanTookQueen) {
    s.queensTaken += 1
    s.queenFreeStreak = 0
  } else {
    s.queenFreeStreak += 1
  }
  if (opts.moonShooter === 0) s.moonsShot += 1
  else if (opts.moonShooter != null) s.moonsAgainst += 1
  if (s.bestHandScore == null || opts.humanPoints < s.bestHandScore) {
    s.bestHandScore = opts.humanPoints
  }
  if (s.worstHandScore == null || opts.humanPoints > s.worstHandScore) {
    s.worstHandScore = opts.humanPoints
  }
  saveStats(s, gameId)
  return s
}

export interface SpadesHandStatsInput {
  humanNil: boolean
  humanNilMade: boolean
  humanBlindNil: boolean
  humanBlindNilMade: boolean
  teamMadeBid: boolean
  teamSet: boolean
  hadBagPenalty: boolean
}

export interface EuchreHandStatsInput {
  humanOrdered: boolean
  humanTeamMaker: boolean
  makerTricks: number
  marched: boolean
  euchred: boolean
  defendedEuchre: boolean
  loner: boolean
}

export function recordEuchreHandEnd(opts: EuchreHandStatsInput): CareerStats {
  const s = loadStats('euchre')
  s.handsPlayed += 1
  if (opts.humanOrdered) {
    if (opts.makerTricks >= 3) s.ordersMade += 1
    else s.ordersFailed += 1
  }
  if (opts.defendedEuchre) s.euchresMade += 1
  if (opts.marched && opts.humanTeamMaker) s.marchesMade += 1
  if (opts.loner && opts.humanOrdered && opts.makerTricks >= 3) s.lonersMade += 1
  saveStats(s, 'euchre')
  return s
}

export function recordSpadesHandEnd(opts: SpadesHandStatsInput): CareerStats {
  const s = loadStats('spades')
  s.handsPlayed += 1
  if (opts.humanNilMade) {
    s.nilMade += 1
    if (opts.humanBlindNilMade) s.blindNilMade += 1
  } else if (opts.humanNil) {
    s.nilFailed += 1
  }
  if (opts.teamMadeBid) s.teamBidsMade += 1
  if (opts.teamSet) s.teamBidsSet += 1
  if (opts.hadBagPenalty) s.bagPenalties += 1
  saveStats(s, 'spades')
  return s
}

export function recordMatchEnd(
  opts: {
    humanWon: boolean
    humanScore: number
    winnerScore: number
    handsInMatch: number
    moonsInMatch: number
    cleanHandsInMatch: number
  },
  gameId: GameId = 'hearts',
): CareerStats {
  const s = loadStats(gameId)
  s.matchesPlayed += 1
  const higherIsBetter = gameId === 'spades' || gameId === 'euchre'
  if (opts.humanWon) {
    s.matchesWon += 1
    s.winStreak += 1
    if (s.winStreak > s.bestWinStreak) s.bestWinStreak = s.winStreak
    if (
      s.bestWinScore == null ||
      (higherIsBetter ? opts.humanScore > s.bestWinScore : opts.humanScore < s.bestWinScore)
    ) {
      s.bestWinScore = opts.humanScore
    }
  } else {
    s.winStreak = 0
    if (
      s.worstLossScore == null ||
      (higherIsBetter ? opts.humanScore < s.worstLossScore : opts.humanScore > s.worstLossScore)
    ) {
      s.worstLossScore = opts.humanScore
    }
  }
  s.recentMatches = [
    {
      at: Date.now(),
      won: opts.humanWon,
      yourScore: opts.humanScore,
      winnerScore: opts.winnerScore,
      handsInMatch: opts.handsInMatch,
      moonsShot: opts.moonsInMatch,
      cleanHands: opts.cleanHandsInMatch,
    },
    ...s.recentMatches,
  ].slice(0, MAX_RECENT)
  saveStats(s, gameId)
  return s
}

export function winRate(stats: CareerStats): number | null {
  if (stats.matchesPlayed <= 0) return null
  return Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
}

export function moonShootRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.moonsShot / stats.handsPlayed) * 1000) / 10
}

export function moonAgainstRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.moonsAgainst / stats.handsPlayed) * 1000) / 10
}

export function queenRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.queensTaken / stats.handsPlayed) * 1000) / 10
}

export function avgPointsPerHand(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.pointsTaken / stats.handsPlayed) * 10) / 10
}

export function cleanHandRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.handsWithZero / stats.handsPlayed) * 1000) / 10
}

export function spadesNilRate(stats: CareerStats): number | null {
  const attempts = stats.nilMade + stats.nilFailed
  if (attempts <= 0) return null
  return Math.round((stats.nilMade / attempts) * 1000) / 10
}

export function spadesTeamBidRate(stats: CareerStats): number | null {
  const attempts = stats.teamBidsMade + stats.teamBidsSet
  if (attempts <= 0) return null
  return Math.round((stats.teamBidsMade / attempts) * 1000) / 10
}

export function spadesBagPenaltyRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.bagPenalties / stats.handsPlayed) * 1000) / 10
}

export function euchreOrderRate(stats: CareerStats): number | null {
  const attempts = stats.ordersMade + stats.ordersFailed
  if (attempts <= 0) return null
  return Math.round((stats.ordersMade / attempts) * 1000) / 10
}

export function euchreEuchreRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.euchresMade / stats.handsPlayed) * 1000) / 10
}

export function euchreMarchRate(stats: CareerStats): number | null {
  if (stats.handsPlayed <= 0) return null
  return Math.round((stats.marchesMade / stats.handsPlayed) * 1000) / 10
}

export function euchreLonerRate(stats: CareerStats): number | null {
  if (stats.ordersMade <= 0) return null
  return Math.round((stats.lonersMade / stats.ordersMade) * 1000) / 10
}

export function resetStats(gameId: GameId = 'hearts'): void {
  saveStats({ ...EMPTY_STATS, recentMatches: [] }, gameId)
}
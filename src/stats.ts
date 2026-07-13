/** Career stats persisted in localStorage. */

const KEY = 'hearts.stats.v1'

export interface CareerStats {
  matchesPlayed: number
  matchesWon: number
  handsPlayed: number
  moonsShot: number
  /** Times an opponent shot the moon */
  moonsAgainst: number
  queensTaken: number
  /** Hands where you scored 0 points */
  handsWithZero: number
  /** Current consecutive match wins */
  winStreak: number
  /** Best consecutive match win streak */
  bestWinStreak: number
  /** Lowest winning match score (null until first win) */
  bestWinScore: number | null
  /** Total penalty points you took (after moon adjustments) */
  pointsTaken: number
}

export const EMPTY_STATS: CareerStats = {
  matchesPlayed: 0,
  matchesWon: 0,
  handsPlayed: 0,
  moonsShot: 0,
  moonsAgainst: 0,
  queensTaken: 0,
  handsWithZero: 0,
  winStreak: 0,
  bestWinStreak: 0,
  bestWinScore: null,
  pointsTaken: 0,
}

export function loadStats(): CareerStats {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY_STATS }
    const p = JSON.parse(raw) as Partial<CareerStats>
    return {
      matchesPlayed: num(p.matchesPlayed),
      matchesWon: num(p.matchesWon),
      handsPlayed: num(p.handsPlayed),
      moonsShot: num(p.moonsShot),
      moonsAgainst: num(p.moonsAgainst),
      queensTaken: num(p.queensTaken),
      handsWithZero: num(p.handsWithZero),
      winStreak: num(p.winStreak),
      bestWinStreak: num(p.bestWinStreak),
      bestWinScore:
        typeof p.bestWinScore === 'number' && Number.isFinite(p.bestWinScore)
          ? p.bestWinScore
          : null,
      pointsTaken: num(p.pointsTaken),
    }
  } catch {
    return { ...EMPTY_STATS }
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
}

export function saveStats(stats: CareerStats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

export function recordHandEnd(opts: {
  humanPoints: number
  humanTookQueen: boolean
  moonShooter: 0 | 1 | 2 | 3 | null
}): CareerStats {
  const s = loadStats()
  s.handsPlayed += 1
  s.pointsTaken += opts.humanPoints
  if (opts.humanPoints === 0) s.handsWithZero += 1
  if (opts.humanTookQueen) s.queensTaken += 1
  if (opts.moonShooter === 0) s.moonsShot += 1
  else if (opts.moonShooter != null) s.moonsAgainst += 1
  saveStats(s)
  return s
}

export function recordMatchEnd(opts: {
  humanWon: boolean
  humanScore: number
}): CareerStats {
  const s = loadStats()
  s.matchesPlayed += 1
  if (opts.humanWon) {
    s.matchesWon += 1
    s.winStreak += 1
    if (s.winStreak > s.bestWinStreak) s.bestWinStreak = s.winStreak
    if (s.bestWinScore == null || opts.humanScore < s.bestWinScore) {
      s.bestWinScore = opts.humanScore
    }
  } else {
    s.winStreak = 0
  }
  saveStats(s)
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

export function resetStats(): void {
  saveStats({ ...EMPTY_STATS })
}
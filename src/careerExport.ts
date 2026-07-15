import {
  loadAchievements,
  saveAchievements,
  visibleAchievements,
  type UnlockedAchievements,
} from './achievements'
import {
  loadEuchreAchievements,
  saveEuchreAchievements,
  visibleEuchreAchievements,
} from './achievements/euchre'
import {
  loadSpadesAchievements,
  saveSpadesAchievements,
  visibleSpadesAchievements,
} from './achievements/spades'
import { APP_VERSION } from './appVersion'
import type { GameId } from './games/registry'
import { goalsCompletedAllGames, goalsCompletedCount, loadGoals } from './goals'
import { gameMeta } from './games/registry'
import {
  loadStats,
  sanitizeCareerStats,
  saveStats,
  winRate,
  type CareerStats,
  type MatchRecord,
} from './stats'
import { loadTrophyCase, saveTrophyCase, visibleTrophies } from './trophyCase'

const GAMES: GameId[] = ['hearts', 'spades', 'euchre']

function loadAchievementUnlocks(gameId: GameId): UnlockedAchievements {
  if (gameId === 'spades') return loadSpadesAchievements()
  if (gameId === 'euchre') return loadEuchreAchievements()
  return loadAchievements(gameId)
}

function saveAchievementUnlocks(gameId: GameId, unlocked: UnlockedAchievements): void {
  if (gameId === 'spades') saveSpadesAchievements(unlocked)
  else if (gameId === 'euchre') saveEuchreAchievements(unlocked)
  else saveAchievements(unlocked, gameId)
}

function achievementCount(gameId: GameId): { unlocked: number; total: number } {
  if (gameId === 'spades') {
    const u = loadSpadesAchievements()
    const v = visibleSpadesAchievements(u)
    return { unlocked: v.filter((a) => u[a.id]).length, total: v.length }
  }
  if (gameId === 'euchre') {
    const u = loadEuchreAchievements()
    const v = visibleEuchreAchievements(u)
    return { unlocked: v.filter((a) => u[a.id]).length, total: v.length }
  }
  const u = loadAchievements(gameId)
  const v = visibleAchievements(u)
  return { unlocked: v.filter((a) => u[a.id]).length, total: v.length }
}

export interface CareerExportGame {
  stats: CareerStats
  achievements: { unlocked: number; total: number }
  /** Full unlock map — present in exports from v0.3.5+. */
  achievementUnlocks?: UnlockedAchievements
  goalsDone: number
  goalsTotal: number
}

export interface CareerExport {
  exportedAt: string
  appVersion: string
  goalsCompleted: number
  trophies: { unlocked: number; total: number }
  /** Full trophy unlock map — present in exports from v0.3.5+. */
  trophyUnlocks?: UnlockedAchievements
  games: Record<GameId, CareerExportGame>
}

export type CareerImportResult =
  | { ok: true; data: CareerExport }
  | { ok: false; error: string }

export function buildCareerExport(): CareerExport {
  const trophies = loadTrophyCase()
  const visible = visibleTrophies(trophies)
  const games = {} as CareerExport['games']

  for (const id of GAMES) {
    const goalsState = loadGoals(id)
    games[id] = {
      stats: loadStats(id),
      achievements: achievementCount(id),
      achievementUnlocks: loadAchievementUnlocks(id),
      goalsDone: goalsCompletedCount(goalsState),
      goalsTotal: goalsState.active.length,
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    goalsCompleted: goalsCompletedAllGames(),
    trophies: {
      unlocked: visible.filter((t) => trophies[t.id]).length,
      total: visible.length,
    },
    trophyUnlocks: trophies,
    games,
  }
}

export function careerExportJson(pretty = true): string {
  const data = buildCareerExport()
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
}

export function careerExportSummary(): string {
  const data = buildCareerExport()
  const exported = new Date(data.exportedAt).toLocaleString()
  const lines = [
    `Cutthroat career · v${data.appVersion}`,
    `Exported ${exported}`,
    '',
    `Trophies: ${data.trophies.unlocked}/${data.trophies.total}`,
    `Goals completed: ${data.goalsCompleted}`,
    '',
  ]

  for (const id of GAMES) {
    const g = data.games[id]
    const meta = gameMeta(id)
    const s = g.stats
    const wr = winRate(s)
    lines.push(`${meta.icon} ${meta.title}`)
    lines.push(
      `  Matches: ${s.matchesWon}W / ${s.matchesPlayed} played${wr != null ? ` (${wr}%)` : ''}`,
    )
    lines.push(`  Hands: ${s.handsPlayed}`)
    lines.push(`  Achievements: ${g.achievements.unlocked}/${g.achievements.total}`)
    lines.push(`  Goals: ${g.goalsDone}/${g.goalsTotal}`)
    if (id === 'hearts') {
      lines.push(`  Moons shot: ${s.moonsShot} · Queen-free streak: ${s.queenFreeStreak}`)
    }
    if (id === 'spades') {
      lines.push(`  Nils made: ${s.nilMade} · Team bids made: ${s.teamBidsMade}`)
    }
    if (id === 'euchre') {
      lines.push(`  Marches: ${s.marchesMade} · Loners: ${s.lonersMade}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export async function copyCareerExportToClipboard(): Promise<boolean> {
  return copyTextToClipboard(careerExportJson())
}

export async function copyCareerSummaryToClipboard(): Promise<boolean> {
  return copyTextToClipboard(careerExportSummary())
}

function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function downloadTextFile(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadCareerExport(): void {
  downloadTextFile(
    careerExportJson(),
    `cutthroat-career-${exportDateStamp()}.json`,
    'application/json',
  )
}

export function downloadCareerSummary(): void {
  downloadTextFile(
    careerExportSummary(),
    `cutthroat-career-${exportDateStamp()}.txt`,
    'text/plain',
  )
}

export function canShareCareerSummary(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function shareCareerSummary(): Promise<boolean> {
  if (!canShareCareerSummary()) return false
  try {
    await navigator.share({
      title: 'Cutthroat career',
      text: careerExportSummary(),
    })
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return true
    return false
  }
}

function sanitizeUnlocks(raw: unknown): UnlockedAchievements {
  if (!raw || typeof raw !== 'object') return {}
  const out: UnlockedAchievements = {}
  for (const [id, ts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof ts === 'number' && Number.isFinite(ts)) out[id] = ts
  }
  return out
}

function isCareerStatsShape(raw: unknown): raw is Partial<CareerStats> {
  return Boolean(raw && typeof raw === 'object' && 'matchesPlayed' in (raw as object))
}

export function parseCareerImport(raw: string): CareerImportResult {
  try {
    const parsed = JSON.parse(raw) as Partial<CareerExport>
    if (!parsed.games || typeof parsed.games !== 'object') {
      return { ok: false, error: 'Missing games section' }
    }
    for (const id of GAMES) {
      const g = parsed.games[id]
      if (!g || !isCareerStatsShape(g.stats)) {
        return { ok: false, error: `Invalid or missing ${id} stats` }
      }
    }
    const games = {} as CareerExport['games']
    for (const id of GAMES) {
      const g = parsed.games[id]!
      games[id] = {
        stats: sanitizeCareerStats(g.stats),
        achievements: g.achievements ?? { unlocked: 0, total: 0 },
        achievementUnlocks: sanitizeUnlocks(g.achievementUnlocks),
        goalsDone: typeof g.goalsDone === 'number' ? g.goalsDone : 0,
        goalsTotal: typeof g.goalsTotal === 'number' ? g.goalsTotal : 0,
      }
    }
    return {
      ok: true,
      data: {
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
        appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : 'unknown',
        goalsCompleted: typeof parsed.goalsCompleted === 'number' ? parsed.goalsCompleted : 0,
        trophies: parsed.trophies ?? { unlocked: 0, total: 0 },
        trophyUnlocks: sanitizeUnlocks(parsed.trophyUnlocks),
        games,
      },
    }
  } catch {
    return { ok: false, error: 'Could not parse JSON' }
  }
}

export type CareerImportMode = 'replace' | 'merge'

const MAX_RECENT_MATCHES = 25

function mergeNullableMax(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.max(a, b)
}

function mergeNullableMin(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

function mergeRecentMatches(a: MatchRecord[], b: MatchRecord[]): MatchRecord[] {
  const seen = new Set<number>()
  const rows: MatchRecord[] = []
  for (const m of [...a, ...b].sort((x, y) => y.at - x.at)) {
    if (seen.has(m.at)) continue
    seen.add(m.at)
    rows.push(m)
  }
  return rows.slice(0, MAX_RECENT_MATCHES)
}

function mergeUnlocks(
  local: UnlockedAchievements,
  incoming: UnlockedAchievements,
): UnlockedAchievements {
  const out = { ...local }
  for (const [id, ts] of Object.entries(incoming)) {
    if (!out[id] || ts < out[id]) out[id] = ts
  }
  return out
}

export function mergeCareerStats(local: CareerStats, incoming: CareerStats): CareerStats {
  const max = (x: number, y: number) => Math.max(x, y)
  return sanitizeCareerStats({
    matchesPlayed: max(local.matchesPlayed, incoming.matchesPlayed),
    matchesWon: max(local.matchesWon, incoming.matchesWon),
    handsPlayed: max(local.handsPlayed, incoming.handsPlayed),
    moonsShot: max(local.moonsShot, incoming.moonsShot),
    moonsAgainst: max(local.moonsAgainst, incoming.moonsAgainst),
    queensTaken: max(local.queensTaken, incoming.queensTaken),
    queenFreeStreak: max(local.queenFreeStreak, incoming.queenFreeStreak),
    handsWithZero: max(local.handsWithZero, incoming.handsWithZero),
    handsUnderFive: max(local.handsUnderFive, incoming.handsUnderFive),
    handsHeavy: max(local.handsHeavy, incoming.handsHeavy),
    winStreak: max(local.winStreak, incoming.winStreak),
    bestWinStreak: max(local.bestWinStreak, incoming.bestWinStreak),
    bestWinScore: mergeNullableMin(local.bestWinScore, incoming.bestWinScore),
    worstLossScore: mergeNullableMax(local.worstLossScore, incoming.worstLossScore),
    pointsTaken: max(local.pointsTaken, incoming.pointsTaken),
    bestHandScore: mergeNullableMin(local.bestHandScore, incoming.bestHandScore),
    worstHandScore: mergeNullableMax(local.worstHandScore, incoming.worstHandScore),
    recentMatches: mergeRecentMatches(local.recentMatches, incoming.recentMatches),
    nilMade: max(local.nilMade, incoming.nilMade),
    nilFailed: max(local.nilFailed, incoming.nilFailed),
    blindNilMade: max(local.blindNilMade, incoming.blindNilMade),
    teamBidsMade: max(local.teamBidsMade, incoming.teamBidsMade),
    teamBidsSet: max(local.teamBidsSet, incoming.teamBidsSet),
    bagPenalties: max(local.bagPenalties, incoming.bagPenalties),
    ordersMade: max(local.ordersMade, incoming.ordersMade),
    ordersFailed: max(local.ordersFailed, incoming.ordersFailed),
    euchresMade: max(local.euchresMade, incoming.euchresMade),
    marchesMade: max(local.marchesMade, incoming.marchesMade),
    lonersMade: max(local.lonersMade, incoming.lonersMade),
  })
}

/** Apply an exported snapshot — replace or merge with local career data. */
export function applyCareerImport(data: CareerExport, mode: CareerImportMode = 'replace'): void {
  for (const id of GAMES) {
    const g = data.games[id]
    const stats =
      mode === 'merge' ? mergeCareerStats(loadStats(id), g.stats) : g.stats
    saveStats(stats, id)
    if (g.achievementUnlocks && Object.keys(g.achievementUnlocks).length > 0) {
      const unlocks =
        mode === 'merge'
          ? mergeUnlocks(loadAchievementUnlocks(id), g.achievementUnlocks)
          : g.achievementUnlocks
      saveAchievementUnlocks(id, unlocks)
    }
  }
  if (data.trophyUnlocks && Object.keys(data.trophyUnlocks).length > 0) {
    const trophies =
      mode === 'merge'
        ? mergeUnlocks(loadTrophyCase(), data.trophyUnlocks)
        : data.trophyUnlocks
    saveTrophyCase(trophies)
  }
}
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
import {
  goalsCompletedAllGames,
  goalsCompletedCount,
  loadGoals,
  loadLifetimeGoalsCompleted,
  saveGoals,
  saveLifetimeGoalsCompleted,
  type GoalDef,
  type GoalProgress,
  type GoalsState,
} from './goals'
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
  /** Full goals state — present in exports from v0.3.7+. */
  goalsState?: GoalsState
}

export interface CareerExport {
  exportedAt: string
  appVersion: string
  goalsCompleted: number
  /** All-time goals claimed — present in exports from v0.3.8+. */
  lifetimeGoalsCompleted?: number
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
      goalsState,
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    goalsCompleted: goalsCompletedAllGames(),
    lifetimeGoalsCompleted: loadLifetimeGoalsCompleted(),
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

/** Compact preview for the import confirm dialog. */
export function careerImportPreview(data: CareerExport): string[] {
  const exported = data.exportedAt
    ? new Date(data.exportedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown date'
  const lines = [
    `Snapshot from v${data.appVersion} · ${exported}`,
    `Trophies ${data.trophies.unlocked}/${data.trophies.total} · Goals ${data.goalsCompleted} · Lifetime ${data.lifetimeGoalsCompleted ?? 0}`,
  ]
  for (const id of GAMES) {
    const g = data.games[id]
    const meta = gameMeta(id)
    const wr = winRate(g.stats)
    lines.push(
      `${meta.icon} ${meta.title}: ${g.stats.matchesWon}W / ${g.stats.matchesPlayed} played${wr != null ? ` (${wr}%)` : ''} · ${g.achievements.unlocked}/${g.achievements.total} achievements`,
    )
  }
  return lines
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
    `Lifetime goals: ${data.lifetimeGoalsCompleted ?? 0}`,
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

function sanitizeGoalDef(raw: unknown): GoalDef | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Partial<GoalDef>
  if (
    typeof g.id !== 'string' ||
    typeof g.gameId !== 'string' ||
    typeof g.period !== 'string' ||
    typeof g.title !== 'string' ||
    typeof g.target !== 'number'
  ) {
    return null
  }
  return {
    id: g.id,
    gameId: g.gameId as GoalDef['gameId'],
    period: g.period as GoalDef['period'],
    title: g.title,
    description: typeof g.description === 'string' ? g.description : '',
    icon: typeof g.icon === 'string' ? g.icon : '🎯',
    target: g.target,
    metric: (g.metric ?? 'matches_won') as GoalDef['metric'],
  }
}

function sanitizeGoalProgress(raw: unknown): GoalProgress | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<GoalProgress>
  if (typeof p.id !== 'string' || typeof p.current !== 'number') return null
  return {
    id: p.id,
    current: p.current,
    completed: Boolean(p.completed),
    claimedAt: typeof p.claimedAt === 'number' ? p.claimedAt : null,
  }
}

function sanitizeGoalsState(raw: unknown): GoalsState | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const g = raw as Partial<GoalsState>
  const periodKeys = g.periodKeys
  if (
    !periodKeys ||
    typeof periodKeys.daily !== 'string' ||
    typeof periodKeys.weekly !== 'string' ||
    typeof periodKeys.monthly !== 'string' ||
    !Array.isArray(g.active)
  ) {
    return undefined
  }
  const active = g.active.map(sanitizeGoalDef).filter((x): x is GoalDef => x != null)
  const progress: Record<string, GoalProgress> = {}
  if (g.progress && typeof g.progress === 'object') {
    for (const [id, row] of Object.entries(g.progress)) {
      const p = sanitizeGoalProgress(row)
      if (p) progress[id] = p
    }
  }
  return { periodKeys, active, progress }
}

function periodKeysMatch(a: GoalsState['periodKeys'], b: GoalsState['periodKeys']): boolean {
  return a.daily === b.daily && a.weekly === b.weekly && a.monthly === b.monthly
}

/** Warnings shown when merge import cannot combine goals (different challenge periods). */
export function careerImportMergeWarnings(data: CareerExport): string[] {
  const lines: string[] = []
  for (const id of GAMES) {
    const incoming = data.games[id].goalsState
    if (!incoming) continue
    const local = loadGoals(id)
    if (!periodKeysMatch(local.periodKeys, incoming.periodKeys)) {
      lines.push(`${gameMeta(id).title} daily goals will not merge — different challenge period`)
    }
  }
  return lines
}

export function mergeGoalsState(local: GoalsState, incoming: GoalsState): GoalsState {
  if (!periodKeysMatch(local.periodKeys, incoming.periodKeys)) return local
  const progress = { ...local.progress }
  for (const [id, inc] of Object.entries(incoming.progress)) {
    const loc = progress[id]
    if (!loc) {
      progress[id] = inc
      continue
    }
    progress[id] = {
      id,
      current: Math.max(loc.current, inc.current),
      completed: loc.completed || inc.completed,
      claimedAt:
        loc.claimedAt != null && inc.claimedAt != null
          ? Math.min(loc.claimedAt, inc.claimedAt)
          : loc.claimedAt ?? inc.claimedAt,
    }
  }
  return { ...local, progress }
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
        goalsState: sanitizeGoalsState(g.goalsState),
      }
    }
    return {
      ok: true,
      data: {
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
        appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : 'unknown',
        goalsCompleted: typeof parsed.goalsCompleted === 'number' ? parsed.goalsCompleted : 0,
        lifetimeGoalsCompleted:
          typeof parsed.lifetimeGoalsCompleted === 'number'
            ? Math.max(0, Math.floor(parsed.lifetimeGoalsCompleted))
            : undefined,
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
    if (g.goalsState) {
      const goals =
        mode === 'merge'
          ? mergeGoalsState(loadGoals(id), g.goalsState)
          : g.goalsState
      saveGoals(goals, id)
    }
  }
  if (data.trophyUnlocks && Object.keys(data.trophyUnlocks).length > 0) {
    const trophies =
      mode === 'merge'
        ? mergeUnlocks(loadTrophyCase(), data.trophyUnlocks)
        : data.trophyUnlocks
    saveTrophyCase(trophies)
  }
  if (typeof data.lifetimeGoalsCompleted === 'number') {
    const lifetime =
      mode === 'merge'
        ? Math.max(loadLifetimeGoalsCompleted(), data.lifetimeGoalsCompleted)
        : data.lifetimeGoalsCompleted
    saveLifetimeGoalsCompleted(lifetime)
  }
}
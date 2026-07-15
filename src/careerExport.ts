import { loadAchievements, visibleAchievements } from './achievements'
import { loadEuchreAchievements, visibleEuchreAchievements } from './achievements/euchre'
import { loadSpadesAchievements, visibleSpadesAchievements } from './achievements/spades'
import { APP_VERSION } from './appVersion'
import type { GameId } from './games/registry'
import { goalsCompletedAllGames, goalsCompletedCount, loadGoals } from './goals'
import { gameMeta } from './games/registry'
import { loadStats, winRate, type CareerStats } from './stats'
import { loadTrophyCase, visibleTrophies } from './trophyCase'

const GAMES: GameId[] = ['hearts', 'spades', 'euchre']

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

export interface CareerExport {
  exportedAt: string
  appVersion: string
  goalsCompleted: number
  trophies: { unlocked: number; total: number }
  games: Record<
    GameId,
    {
      stats: CareerStats
      achievements: { unlocked: number; total: number }
      goalsDone: number
      goalsTotal: number
    }
  >
}

export function buildCareerExport(): CareerExport {
  const trophies = loadTrophyCase()
  const visible = visibleTrophies(trophies)
  const games = {} as CareerExport['games']

  for (const id of GAMES) {
    const goalsState = loadGoals(id)
    games[id] = {
      stats: loadStats(id),
      achievements: achievementCount(id),
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
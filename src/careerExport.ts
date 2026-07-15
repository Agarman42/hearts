import { loadAchievements, visibleAchievements } from './achievements'
import { loadEuchreAchievements, visibleEuchreAchievements } from './achievements/euchre'
import { loadSpadesAchievements, visibleSpadesAchievements } from './achievements/spades'
import { APP_VERSION } from './appVersion'
import type { GameId } from './games/registry'
import { goalsCompletedAllGames, goalsCompletedCount, loadGoals } from './goals'
import { loadStats, type CareerStats } from './stats'
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

export async function copyCareerExportToClipboard(): Promise<boolean> {
  const text = careerExportJson()
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
/**
 * Cutthroat Trophy Case — cross-game achievements (shared showcase).
 * Per-game stats stay separate; these unlock from any combination of games.
 */

import type { GameId } from './games/registry'
import { countAllUnlockedAchievements, maxUnlockedInAnyGame } from './achievements/global'
import { goalsCompletedToday, loadLifetimeGoalsCompleted } from './goals'
import { loadStats as loadGameStats } from './stats'

const KEY = 'cardtable.trophyCase.v1'

/** Games currently shipped in Cutthroat. */
const SHIPPED_GAMES: GameId[] = ['hearts', 'spades', 'euchre']

export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Trophy {
  id: string
  title: string
  description: string
  icon: string
  tier: TrophyTier
  secret?: boolean
  /** Which games can contribute (empty = any). */
  games?: GameId[]
}

export const TROPHY_CASE: Trophy[] = [
  {
    id: 'table_regular',
    title: 'Table Regular',
    description: 'Play a match in every game in the parlour.',
    icon: '🎴',
    tier: 'gold',
  },
  {
    id: 'triple_crown',
    title: 'Triple Crown',
    description: 'Win a match in Hearts, Spades, and Euchre.',
    icon: '👑',
    tier: 'platinum',
    secret: true,
  },
  {
    id: 'well_rounded',
    title: 'Well Rounded',
    description: 'Play 25 hands in each available game.',
    icon: '🔮',
    tier: 'gold',
  },
  {
    id: 'marathon_player',
    title: 'Marathon Player',
    description: 'Play 500 hands across all games combined.',
    icon: '🏃',
    tier: 'silver',
  },
  {
    id: 'win_collector',
    title: 'Win Collector',
    description: 'Win 50 matches across all games combined.',
    icon: '🏆',
    tier: 'gold',
  },
  {
    id: 'partner_up',
    title: 'Partner Up',
    description: 'Win your first partnership game (Spades or Euchre).',
    icon: '🤝',
    tier: 'bronze',
    games: ['spades', 'euchre'],
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete 3 daily goals in one day.',
    icon: '🦉',
    tier: 'bronze',
  },
  {
    id: 'goal_crusher',
    title: 'Goal Crusher',
    description: 'Complete 30 daily, weekly, or monthly goals total.',
    icon: '🎯',
    tier: 'silver',
  },
  {
    id: 'achievement_hunter',
    title: 'Achievement Hunter',
    description: 'Unlock 25 achievements across any games.',
    icon: '🏅',
    tier: 'gold',
  },
  {
    id: 'specialist',
    title: 'Specialist',
    description: 'Unlock 8 achievements in a single game.',
    icon: '🎓',
    tier: 'silver',
  },
  {
    id: 'century_club',
    title: 'Century Club',
    description: 'Play 100 matches combined across all games.',
    icon: '💯',
    tier: 'gold',
  },
  {
    id: 'hot_table',
    title: 'Hot Table',
    description: 'Win 5 matches in a row in any game.',
    icon: '🔥',
    tier: 'silver',
    games: ['hearts', 'spades', 'euchre'],
  },
]

export type UnlockedTrophies = Record<string, number>

export function loadTrophyCase(): UnlockedTrophies {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, unknown>
    const out: UnlockedTrophies = {}
    for (const [id, ts] of Object.entries(p)) {
      if (typeof ts === 'number' && Number.isFinite(ts)) out[id] = ts
    }
    return out
  } catch {
    return {}
  }
}

export function saveTrophyCase(unlocked: UnlockedTrophies): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(unlocked))
  } catch {
    /* ignore */
  }
}

export function unlockTrophy(id: string): Trophy | null {
  const def = TROPHY_CASE.find((t) => t.id === id)
  if (!def) return null
  const unlocked = loadTrophyCase()
  if (unlocked[id]) return null
  unlocked[id] = Date.now()
  saveTrophyCase(unlocked)
  return def
}

function combinedHands(): number {
  return (
    loadGameStats('hearts').handsPlayed +
    loadGameStats('spades').handsPlayed +
    loadGameStats('euchre').handsPlayed
  )
}

function combinedWins(): number {
  return (
    loadGameStats('hearts').matchesWon +
    loadGameStats('spades').matchesWon +
    loadGameStats('euchre').matchesWon
  )
}

function combinedMatches(): number {
  return (
    loadGameStats('hearts').matchesPlayed +
    loadGameStats('spades').matchesPlayed +
    loadGameStats('euchre').matchesPlayed
  )
}

function bestWinStreakAnyGame(): number {
  return Math.max(
    loadGameStats('hearts').bestWinStreak,
    loadGameStats('spades').bestWinStreak,
    loadGameStats('euchre').bestWinStreak,
  )
}

function allShipped(predicate: (gameId: GameId) => boolean): boolean {
  return SHIPPED_GAMES.every(predicate)
}

/** Re-evaluate global trophies after any game event. */
export function checkTrophyCase(): Trophy[] {
  const out: Trophy[] = []
  const tryUnlock = (id: string) => {
    const t = unlockTrophy(id)
    if (t) out.push(t)
  }

  if (allShipped((g) => loadGameStats(g).matchesPlayed > 0)) {
    tryUnlock('table_regular')
  }
  if (allShipped((g) => loadGameStats(g).matchesWon > 0)) {
    tryUnlock('triple_crown')
  }
  if (allShipped((g) => loadGameStats(g).handsPlayed >= 25)) {
    tryUnlock('well_rounded')
  }

  if (combinedHands() >= 500) tryUnlock('marathon_player')
  if (combinedWins() >= 50) tryUnlock('win_collector')

  const spades = loadGameStats('spades')
  const euchre = loadGameStats('euchre')
  if (spades.matchesWon > 0 || euchre.matchesWon > 0) {
    tryUnlock('partner_up')
  }

  if (goalsCompletedToday() >= 3) tryUnlock('night_owl')
  if (loadLifetimeGoalsCompleted() >= 30) tryUnlock('goal_crusher')

  if (countAllUnlockedAchievements() >= 25) tryUnlock('achievement_hunter')
  if (maxUnlockedInAnyGame() >= 8) tryUnlock('specialist')
  if (combinedMatches() >= 100) tryUnlock('century_club')
  if (bestWinStreakAnyGame() >= 5) tryUnlock('hot_table')

  return out
}

export function visibleTrophies(unlocked = loadTrophyCase()): Trophy[] {
  return TROPHY_CASE.filter((t) => !t.secret || unlocked[t.id])
}

/** Progress toward trackable cross-game trophies (for Stats page). */
export function trophyProgress(
  id: string,
  unlocked = loadTrophyCase(),
): { current: number; target: number } | null {
  if (unlocked[id]) return null
  switch (id) {
    case 'well_rounded': {
      const mins = SHIPPED_GAMES.map((g) => loadGameStats(g).handsPlayed)
      return { current: Math.min(...mins), target: 25 }
    }
    case 'marathon_player':
      return { current: combinedHands(), target: 500 }
    case 'win_collector':
      return { current: combinedWins(), target: 50 }
    case 'achievement_hunter':
      return { current: countAllUnlockedAchievements(), target: 25 }
    case 'specialist':
      return { current: maxUnlockedInAnyGame(), target: 8 }
    case 'century_club':
      return { current: combinedMatches(), target: 100 }
    case 'hot_table':
      return { current: bestWinStreakAnyGame(), target: 5 }
    case 'goal_crusher':
      return { current: loadLifetimeGoalsCompleted(), target: 30 }
    case 'night_owl':
      return { current: goalsCompletedToday(), target: 3 }
    default:
      return null
  }
}
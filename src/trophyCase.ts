/**
 * Card Table Trophy Case — cross-game achievements (shared showcase).
 * Per-game stats stay separate; these unlock from any combination of games.
 */

import type { GameId } from './games/registry'
import { goalsCompletedToday, loadLifetimeGoalsCompleted } from './goals'
import { loadStats as loadGameStats } from './stats'

const KEY = 'cardtable.trophyCase.v1'

/** Games currently shipped on Card Table — extend when Spades/Euchre launch. */
const SHIPPED_GAMES: GameId[] = ['hearts']

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
    description: 'Play a match in every game on Card Table.',
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

  return out
}

export function visibleTrophies(unlocked = loadTrophyCase()): Trophy[] {
  return TROPHY_CASE.filter((t) => !t.secret || unlocked[t.id])
}
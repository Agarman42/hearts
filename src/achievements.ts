/** Career achievements — unlocked on special plays and milestones. */

import type { Seat } from './core/types'
import type { HeartsState } from './games/hearts/engine'
import { loadStats, type CareerStats } from './stats'

const KEY = 'hearts.achievements.v1'

export type AchievementTier = 'bronze' | 'silver' | 'gold'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  tier: AchievementTier
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    title: 'Table Captain',
    description: 'Win your first match.',
    icon: '🏆',
    tier: 'bronze',
  },
  {
    id: 'moon_shot',
    title: 'Moon Walker',
    description: 'Shoot the moon.',
    icon: '🌙',
    tier: 'gold',
  },
  {
    id: 'clean_hand',
    title: 'Squeaky Clean',
    description: 'Score 0 points on a hand.',
    icon: '✨',
    tier: 'bronze',
  },
  {
    id: 'clean_match',
    title: 'Heart of Ice',
    description: 'Win a match without taking a single point.',
    icon: '🧊',
    tier: 'gold',
  },
  {
    id: 'low_win',
    title: 'Efficient',
    description: 'Win a match with 50 points or fewer.',
    icon: '🎯',
    tier: 'silver',
  },
  {
    id: 'mooned',
    title: 'Collateral Damage',
    description: 'Eat a full moon — take 26 points in one hand.',
    icon: '💥',
    tier: 'bronze',
  },
  {
    id: 'queen_dodge',
    title: 'Queen Dodger',
    description: 'Finish a hand without taking the Queen of Spades.',
    icon: '👑',
    tier: 'silver',
  },
  {
    id: 'veteran',
    title: 'Regular',
    description: 'Play 10 matches.',
    icon: '♠',
    tier: 'bronze',
  },
  {
    id: 'moon_hunter',
    title: 'Lunar Legend',
    description: 'Shoot the moon 3 times.',
    icon: '🚀',
    tier: 'gold',
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: 'Win 3 matches in a row.',
    icon: '🔥',
    tier: 'silver',
  },
  {
    id: 'century_hands',
    title: 'Card Sharp',
    description: 'Play 100 hands.',
    icon: '💯',
    tier: 'silver',
  },
  {
    id: 'perfect_streak',
    title: 'Untouchable',
    description: 'Score 0 on three hands in one match.',
    icon: '🛡️',
    tier: 'gold',
  },
]

export type UnlockedAchievements = Record<string, number>

export function loadAchievements(): UnlockedAchievements {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, unknown>
    const out: UnlockedAchievements = {}
    for (const [id, ts] of Object.entries(p)) {
      if (typeof ts === 'number' && Number.isFinite(ts)) out[id] = ts
    }
    return out
  } catch {
    return {}
  }
}

export function saveAchievements(unlocked: UnlockedAchievements): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(unlocked))
  } catch {
    /* ignore */
  }
}

export function isUnlocked(id: string, unlocked = loadAchievements()): boolean {
  return id in unlocked
}

export function unlockAchievement(id: string): Achievement | null {
  const def = ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return null
  const unlocked = loadAchievements()
  if (unlocked[id]) return null
  unlocked[id] = Date.now()
  saveAchievements(unlocked)
  return def
}

export interface HandAchievementInput {
  humanPoints: number
  humanTookQueen: boolean
  moonShooter: Seat | null
  zeroHandsThisMatch: number
}

export interface MatchAchievementInput {
  humanWon: boolean
  humanScore: number
  zeroHandsThisMatch: number
}

/** Returns newly unlocked achievements for a completed hand. */
export function checkHandAchievements(
  input: HandAchievementInput,
  stats: CareerStats = loadStats(),
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockAchievement(id)
    if (a) out.push(a)
  }

  if (input.humanPoints === 0) tryUnlock('clean_hand')
  if (input.humanPoints >= 26 && input.moonShooter != null && input.moonShooter !== 0) {
    tryUnlock('mooned')
  }
  if (!input.humanTookQueen) tryUnlock('queen_dodge')
  if (input.moonShooter === 0) tryUnlock('moon_shot')
  if (input.zeroHandsThisMatch >= 3) tryUnlock('perfect_streak')
  if (stats.handsPlayed + 1 >= 100) tryUnlock('century_hands')

  return out
}

/** Returns newly unlocked achievements when a match ends. */
export function checkMatchAchievements(
  input: MatchAchievementInput,
  stats: CareerStats = loadStats(),
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockAchievement(id)
    if (a) out.push(a)
  }

  if (input.humanWon) {
    tryUnlock('first_win')
    if (input.humanScore <= 50) tryUnlock('low_win')
    if (input.humanScore === 0) tryUnlock('clean_match')
  }

  if (stats.matchesPlayed >= 10) tryUnlock('veteran')
  if (stats.moonsShot >= 3) tryUnlock('moon_hunter')
  if (stats.winStreak >= 3) tryUnlock('streak_3')

  return out
}

/** Convenience: pull hand fields from engine state. */
export function handInputFromState(
  state: HeartsState,
  zeroHandsThisMatch: number,
): HandAchievementInput {
  const human = state.players[0]
  const handPts = state.handScores?.[0] ?? human.handPoints
  return {
    humanPoints: handPts,
    humanTookQueen: human.hasQueen,
    moonShooter: state.moonShooter,
    zeroHandsThisMatch,
  }
}

export function achievementProgress(
  id: string,
  stats: CareerStats = loadStats(),
): { current: number; target: number } | null {
  switch (id) {
    case 'veteran':
      return { current: stats.matchesPlayed, target: 10 }
    case 'century_hands':
      return { current: stats.handsPlayed, target: 100 }
    case 'moon_hunter':
      return { current: stats.moonsShot, target: 3 }
    case 'streak_3':
      return { current: stats.winStreak, target: 3 }
    default:
      return null
  }
}
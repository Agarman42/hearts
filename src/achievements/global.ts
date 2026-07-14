/** Cross-game achievement utilities — collector counts all shipped games. */

import type { Achievement } from '../achievements'
import { ACHIEVEMENTS, loadAchievements, unlockAchievement } from '../achievements'
import { EUCHRE_ACHIEVEMENTS, loadEuchreAchievements } from '../achievements/euchre'
import { SPADES_ACHIEVEMENTS, loadSpadesAchievements } from '../achievements/spades'
import type { GameId } from '../games/registry'

const SHIPPED: GameId[] = ['hearts', 'spades', 'euchre']

export function totalAchievementDefs(): number {
  return ACHIEVEMENTS.length + SPADES_ACHIEVEMENTS.length + EUCHRE_ACHIEVEMENTS.length
}

export function countAllUnlockedAchievements(): number {
  return (
    Object.keys(loadAchievements('hearts')).length +
    Object.keys(loadSpadesAchievements()).length +
    Object.keys(loadEuchreAchievements()).length
  )
}

export function unlockedCountForGame(gameId: GameId): number {
  if (gameId === 'spades') return Object.keys(loadSpadesAchievements()).length
  if (gameId === 'euchre') return Object.keys(loadEuchreAchievements()).length
  return Object.keys(loadAchievements('hearts')).length
}

export function maxUnlockedInAnyGame(): number {
  return Math.max(...SHIPPED.map((g) => unlockedCountForGame(g)))
}

/** Re-check Hearts cross-game achievements (collector) after any game unlock. */
export function checkGlobalAchievements(): Achievement[] {
  const out: Achievement[] = []
  const count = countAllUnlockedAchievements()

  if (count >= 15) {
    const a = unlockAchievement('collector', 'hearts')
    if (a) out.push(a)
  }

  return out
}
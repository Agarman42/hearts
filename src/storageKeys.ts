import type { GameId } from './games/registry'

export function prefsKey(gameId: GameId = 'hearts'): string {
  return `cardtable.prefs.${gameId}.v3`
}

export function statsKey(gameId: GameId = 'hearts'): string {
  return `cardtable.stats.${gameId}.v2`
}

export function achievementsKey(gameId: GameId = 'hearts'): string {
  return `cardtable.achievements.${gameId}.v2`
}

export function goalsKey(gameId: GameId = 'hearts'): string {
  return `cardtable.goals.${gameId}.v1`
}

export function coachKey(gameId: GameId = 'hearts'): string {
  return `cardtable.coach.${gameId}.v1`
}

export function saveKey(gameId: GameId = 'hearts'): string {
  return `cardtable.game.${gameId}.v2`
}

/** Legacy Hearts keys — migrated on first load. */
export const LEGACY_KEYS = {
  prefs: 'hearts.prefs.v2',
  stats: 'hearts.stats.v1',
  achievements: 'hearts.achievements.v1',
  coach: 'hearts.coach.v1',
  save: 'hearts.game.hearts.v2',
  saveLegacy: 'hearts.game.v1',
} as const
import type { GameId } from '../games/registry'

export type AppScreen = 'home' | 'table' | 'settings' | 'stats'

/** True when a game hook should not run timers, AI, or saves. */
export function isGameHookPaused(
  activeGame: GameId,
  screen: AppScreen,
  hookGame: GameId,
): boolean {
  return activeGame !== hookGame || screen !== 'table'
}
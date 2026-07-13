import type { GameId } from './games/registry'
import type { HeartsState } from './games/hearts/engine'
import { isHeartsInProgress } from './games/hearts/engine'
import { LEGACY_KEYS, saveKey } from './storageKeys'

export type { GameId }

export interface SavedGame<TState = HeartsState> {
  version: 2
  gameId: GameId
  savedAt: number
  state: TState
}

export function isInProgress(state: HeartsState, gameId: GameId = 'hearts'): boolean {
  if (gameId === 'hearts') return isHeartsInProgress(state)
  return false
}

function normalizeState(state: HeartsState): HeartsState {
  if (!Array.isArray(state.receivedCards)) {
    return { ...state, receivedCards: [] }
  }
  if (typeof state.matchComplete !== 'boolean') {
    return { ...state, matchComplete: false }
  }
  return state
}

export function saveGame(state: HeartsState, gameId: GameId = 'hearts'): void {
  try {
    if (!isInProgress(state, gameId) && state.phase !== 'game_over') {
      if (state.phase === 'idle') clearGame(gameId)
      return
    }
    if (state.phase === 'game_over') {
      clearGame(gameId)
      return
    }
    const payload: SavedGame = {
      version: 2,
      gameId,
      savedAt: Date.now(),
      state,
    }
    localStorage.setItem(saveKey(gameId), JSON.stringify(payload))
    if (gameId === 'hearts') {
      try {
        localStorage.removeItem(LEGACY_KEYS.saveLegacy)
        localStorage.removeItem(LEGACY_KEYS.save)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* quota / private mode */
  }
}

export function loadGame(gameId: GameId = 'hearts'): SavedGame | null {
  try {
    const key = saveKey(gameId)
    let raw = localStorage.getItem(key)
    let fromLegacy = false
    if (!raw && gameId === 'hearts') {
      raw = localStorage.getItem(LEGACY_KEYS.save) ?? localStorage.getItem(LEGACY_KEYS.saveLegacy)
      fromLegacy = Boolean(raw)
    }
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedGame & { version?: number }
    if (!parsed?.state?.phase) return null
    if (!isInProgress(parsed.state, gameId)) {
      clearGame(gameId)
      return null
    }
    const migrated: SavedGame = {
      version: 2,
      gameId,
      savedAt: parsed.savedAt ?? Date.now(),
      state: normalizeState(parsed.state as HeartsState),
    }
    if (fromLegacy) {
      localStorage.setItem(key, JSON.stringify(migrated))
      localStorage.removeItem(LEGACY_KEYS.saveLegacy)
      localStorage.removeItem(LEGACY_KEYS.save)
    }
    return migrated
  } catch {
    return null
  }
}

export function clearGame(gameId: GameId = 'hearts'): void {
  try {
    localStorage.removeItem(saveKey(gameId))
    if (gameId === 'hearts') {
      localStorage.removeItem(LEGACY_KEYS.saveLegacy)
      localStorage.removeItem(LEGACY_KEYS.save)
    }
  } catch {
    /* ignore */
  }
}

export function hasSavedGame(gameId: GameId = 'hearts'): boolean {
  return loadGame(gameId) != null
}
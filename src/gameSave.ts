import type { GameId } from './games/registry'
import type { HeartsState } from './games/hearts/engine'
import type { SpadesState } from './games/spades/engine'
import { isHeartsInProgress, isSpadesInProgress } from './games/inProgress'
import { LEGACY_KEYS, saveKey } from './storageKeys'

export type { GameId }

export type SavedGameState = HeartsState | SpadesState

export interface SavedGame<TState extends SavedGameState = SavedGameState> {
  version: 2
  gameId: GameId
  savedAt: number
  state: TState
}

export function isInProgress(state: SavedGameState, gameId: GameId): boolean {
  if (gameId === 'hearts') return isHeartsInProgress(state as HeartsState)
  if (gameId === 'spades') return isSpadesInProgress(state as SpadesState)
  return false
}

function normalizeHeartsState(state: HeartsState): HeartsState {
  if (!Array.isArray(state.receivedCards)) {
    return { ...state, receivedCards: [] }
  }
  if (typeof state.matchComplete !== 'boolean') {
    return { ...state, matchComplete: false }
  }
  return state
}

export function saveGame(state: SavedGameState, gameId: GameId = 'hearts'): void {
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
    if (parsed.gameId && parsed.gameId !== gameId) return null
    if (!isInProgress(parsed.state, gameId)) {
      clearGame(gameId)
      return null
    }
    const state =
      gameId === 'hearts'
        ? normalizeHeartsState(parsed.state as HeartsState)
        : (parsed.state as SpadesState)
    const migrated: SavedGame = {
      version: 2,
      gameId,
      savedAt: parsed.savedAt ?? Date.now(),
      state,
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
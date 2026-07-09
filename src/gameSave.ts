import type { HeartsState } from './games/hearts/engine'

/** Per-game save keys so future Spades/Euchre don't clobber Hearts. */
export type GameId = 'hearts' // | 'spades' | 'euchre' later

const SAVE_PREFIX = 'hearts.game'
const LEGACY_KEY = 'hearts.game.v1'

function saveKey(gameId: GameId): string {
  return `${SAVE_PREFIX}.${gameId}.v2`
}

export interface SavedGame {
  version: 2
  gameId: GameId
  savedAt: number
  state: HeartsState
}

/** Phases that count as an in-progress match worth restoring. */
export function isInProgress(state: HeartsState): boolean {
  return (
    state.phase === 'passing' ||
    state.phase === 'receiving' ||
    state.phase === 'playing' ||
    state.phase === 'trick_reveal' ||
    state.phase === 'hand_result'
  )
}

function normalizeState(state: HeartsState): HeartsState {
  // Back-compat: older saves may lack receivedCards
  if (!Array.isArray(state.receivedCards)) {
    return { ...state, receivedCards: [] }
  }
  return state
}

export function saveGame(state: HeartsState, gameId: GameId = 'hearts'): void {
  try {
    if (!isInProgress(state) && state.phase !== 'game_over') {
      if (state.phase === 'idle') clearGame(gameId)
      return
    }
    // Don't keep finished matches as "continue"
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
    // Drop legacy single-slot key once we've written the new one
    try {
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* ignore */
    }
  } catch {
    /* quota / private mode */
  }
}

export function loadGame(gameId: GameId = 'hearts'): SavedGame | null {
  try {
    const key = saveKey(gameId)
    let raw = localStorage.getItem(key)

    // Migrate v1 single-slot save → hearts.v2
    if (!raw && gameId === 'hearts') {
      const legacy = localStorage.getItem(LEGACY_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy) as { version?: number; state?: HeartsState; savedAt?: number }
        if (parsed?.state?.phase && isInProgress(parsed.state)) {
          const migrated: SavedGame = {
            version: 2,
            gameId: 'hearts',
            savedAt: parsed.savedAt ?? Date.now(),
            state: normalizeState(parsed.state),
          }
          localStorage.setItem(key, JSON.stringify(migrated))
          localStorage.removeItem(LEGACY_KEY)
          return migrated
        }
        localStorage.removeItem(LEGACY_KEY)
      }
      return null
    }

    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedGame
    if (!parsed?.state?.phase) return null
    if (parsed.version !== 2 && (parsed as { version?: number }).version !== 1) return null
    if (!isInProgress(parsed.state)) {
      clearGame(gameId)
      return null
    }
    return {
      version: 2,
      gameId,
      savedAt: parsed.savedAt ?? Date.now(),
      state: normalizeState(parsed.state),
    }
  } catch {
    return null
  }
}

export function clearGame(gameId: GameId = 'hearts'): void {
  try {
    localStorage.removeItem(saveKey(gameId))
    if (gameId === 'hearts') localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}

export function hasSavedGame(gameId: GameId = 'hearts'): boolean {
  return loadGame(gameId) != null
}

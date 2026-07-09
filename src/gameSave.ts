import type { HeartsState } from './games/hearts/engine'

const SAVE_KEY = 'hearts.game.v1'

export interface SavedGame {
  version: 1
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

export function saveGame(state: HeartsState): void {
  try {
    if (!isInProgress(state) && state.phase !== 'game_over') {
      // idle — nothing to keep
      if (state.phase === 'idle') clearGame()
      return
    }
    // Don't keep finished matches as "continue"
    if (state.phase === 'game_over') {
      clearGame()
      return
    }
    const payload: SavedGame = {
      version: 1,
      savedAt: Date.now(),
      state,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedGame
    if (parsed?.version !== 1 || !parsed.state?.phase) return null
    if (!isInProgress(parsed.state)) {
      clearGame()
      return null
    }
    // Back-compat: older saves may lack receivedCards
    if (!Array.isArray(parsed.state.receivedCards)) {
      parsed.state.receivedCards = []
    }
    return parsed
  } catch {
    return null
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}

export function hasSavedGame(): boolean {
  return loadGame() != null
}

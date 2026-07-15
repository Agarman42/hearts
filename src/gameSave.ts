import type { PassPlayPrefs } from './passAndPlay'
import type { GameId } from './games/registry'
import { createInitialState as createHeartsState, type HeartsState } from './games/hearts/engine'
import { sortHeartsHand } from './games/hearts/hand'
import { normalizeSpadesState, type SpadesState } from './games/spades/engine'
import { normalizeEuchreState, type EuchreState } from './games/euchre/engine'
import { SEATS } from './core/types'
import { isEuchreInProgress, isHeartsInProgress, isSpadesInProgress } from './games/inProgress'
import { normalizeMatchTrack, type SavedMatchTrack } from './matchTrack'
import { LEGACY_KEYS, saveKey } from './storageKeys'

export type { GameId }

export type SavedGameState = HeartsState | SpadesState | EuchreState

export interface SavedGame<TState extends SavedGameState = SavedGameState> {
  version: 2
  gameId: GameId
  savedAt: number
  state: TState
  /** Session counters for match-level achievements — restored on resume. */
  matchTrack?: SavedMatchTrack
  /** Pass-and-play config at save time — restored on resume for accurate hints. */
  passPlay?: PassPlayPrefs
}

export function isInProgress(state: SavedGameState, gameId: GameId): boolean {
  if (gameId === 'hearts') return isHeartsInProgress(state as HeartsState)
  if (gameId === 'spades') return isSpadesInProgress(state as SpadesState)
  if (gameId === 'euchre') return isEuchreInProgress(state as EuchreState)
  return false
}

function normalizeHeartsState(state: HeartsState): HeartsState {
  const base = createHeartsState()
  const players = { ...base.players }
  for (const seat of SEATS) {
    const saved = state.players?.[seat]
    players[seat] = {
      ...base.players[seat],
      ...(saved ?? {}),
      selectedPass: saved?.selectedPass ?? [],
      hand: sortHeartsHand(saved?.hand ?? []),
    }
  }
  const receivedCards = Array.isArray(state.receivedCards)
    ? sortHeartsHand(state.receivedCards)
    : []
  return {
    ...base,
    ...state,
    players,
    receivedCards,
    passSelections: state.passSelections ?? {},
    pendingReceives: state.pendingReceives ?? {},
    currentTrick: state.currentTrick ?? [],
    completedTricks: state.completedTricks ?? [],
    heartsBroken: state.heartsBroken ?? false,
    isFirstTrick: state.isFirstTrick ?? true,
    matchComplete: state.matchComplete ?? false,
    winner: state.winner ?? null,
    lastTrick: state.lastTrick ?? null,
    handScores: state.handScores ?? null,
    moonShooter: state.moonShooter ?? null,
    awaitingPassAck: state.awaitingPassAck ?? false,
  }
}

export function saveGame(
  state: SavedGameState,
  gameId: GameId = 'hearts',
  matchTrack?: SavedMatchTrack,
  passPlay?: PassPlayPrefs,
): void {
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
      ...(matchTrack ? { matchTrack } : {}),
      ...(passPlay ? { passPlay } : {}),
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
    let state: SavedGameState
    try {
      state =
        gameId === 'hearts'
          ? normalizeHeartsState(parsed.state as HeartsState)
          : gameId === 'spades'
            ? normalizeSpadesState(parsed.state as SpadesState)
            : normalizeEuchreState(parsed.state as EuchreState)
    } catch {
      clearGame(gameId)
      return null
    }
    const migrated: SavedGame = {
      version: 2,
      gameId,
      savedAt: parsed.savedAt ?? Date.now(),
      state,
      matchTrack: normalizeMatchTrack(gameId, parsed.matchTrack),
      ...(parsed.passPlay ? { passPlay: parsed.passPlay } : {}),
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

const ALL_GAME_IDS: GameId[] = ['hearts', 'spades', 'euchre']

/** Most recently saved in-progress match across all games. */
export function getLatestSave(): SavedGame | null {
  let latest: SavedGame | null = null
  for (const gameId of ALL_GAME_IDS) {
    const saved = loadGame(gameId)
    if (!saved) continue
    if (!latest || saved.savedAt >= latest.savedAt) latest = saved
  }
  return latest
}
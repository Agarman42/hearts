import { afterEach, describe, expect, it } from 'vitest'
import { clearGame, getLatestSave, loadGame, saveGame } from './gameSave'
import { defaultHeartsMatchTrack } from './matchTrack'
import type { HeartsState } from './games/hearts/engine'
import { createInitialState, startNewGame } from './games/hearts/engine'
import {
  createInitialState as createSpadesState,
  startNewGame as startSpadesGame,
} from './games/spades/engine'
import type { SpadesState } from './games/spades/engine'
import {
  createInitialState as createEuchreState,
  startNewGame as startEuchreGame,
} from './games/euchre/engine'
import type { EuchreState } from './games/euchre/engine'
import { loadPrefs } from './prefs'
import { saveKey } from './storageKeys'

function playingState(): HeartsState {
  // startNewGame deals into passing; force a playing-ish phase for save tests
  let s = startNewGame(createInitialState(loadPrefs()), loadPrefs())
  s = {
    ...s,
    phase: 'playing',
    whoseTurn: 0,
  }
  return s
}

afterEach(() => {
  clearGame('hearts')
  clearGame('spades')
  clearGame('euchre')
  try {
    localStorage.removeItem('hearts.game.v1')
  } catch {
    /* ignore */
  }
})

describe('gameSave', () => {
  it('saves and loads an in-progress hearts match', () => {
    const state = playingState()
    saveGame(state, 'hearts')
    const loaded = loadGame('hearts')
    expect(loaded).not.toBeNull()
    expect(loaded!.gameId).toBe('hearts')
    expect(loaded!.version).toBe(2)
    expect(loaded!.state.phase).toBe('playing')
  })

  it('round-trips matchTrack with a hearts save', () => {
    const state = playingState()
    const track = { ...defaultHeartsMatchTrack(), hands: 4, zeroHands: 2 }
    saveGame(state, 'hearts', track)
    const loaded = loadGame('hearts')
    expect(loaded?.matchTrack).toEqual(track)
  })

  it('clears finished / idle games', () => {
    const state = { ...playingState(), phase: 'game_over' as const }
    saveGame(state, 'hearts')
    expect(loadGame('hearts')).toBeNull()
  })

  it('saves and loads an in-progress spades match', () => {
    let state = startSpadesGame(createSpadesState()) as SpadesState
    state = { ...state, phase: 'playing' }
    saveGame(state, 'spades')
    const loaded = loadGame('spades')
    expect(loaded).not.toBeNull()
    expect(loaded!.gameId).toBe('spades')
    expect(loaded!.state.phase).toBe('playing')
  })

  it('clears finished spades games', () => {
    let state = startSpadesGame(createSpadesState()) as SpadesState
    state = { ...state, phase: 'game_over' }
    saveGame(state, 'spades')
    expect(loadGame('spades')).toBeNull()
  })

  it('saves and loads an in-progress euchre match', () => {
    let state = startEuchreGame(createEuchreState()) as EuchreState
    state = { ...state, phase: 'playing' }
    saveGame(state, 'euchre')
    const loaded = loadGame('euchre')
    expect(loaded).not.toBeNull()
    expect(loaded!.gameId).toBe('euchre')
    expect(loaded!.state.phase).toBe('playing')
  })

  it('saves euchre loner state fields', () => {
    let state = startEuchreGame(createEuchreState()) as EuchreState
    state = {
      ...state,
      phase: 'playing',
      loner: true,
      sittingOut: 2,
      maker: 0,
      makerTeam: 'ns',
      trump: 'hearts',
    }
    saveGame(state, 'euchre')
    const loaded = loadGame('euchre')?.state as EuchreState
    expect(loaded.loner).toBe(true)
    expect(loaded.sittingOut).toBe(2)
  })

  it('clears finished euchre games', () => {
    let state = startEuchreGame(createEuchreState()) as EuchreState
    state = { ...state, phase: 'game_over' }
    saveGame(state, 'euchre')
    expect(loadGame('euchre')).toBeNull()
  })

  it('returns the most recently saved game across all titles', () => {
    const heartsState = playingState()
    const spadesState = { ...startSpadesGame(createSpadesState()), phase: 'playing' as const }
    const euchreState = { ...startEuchreGame(createEuchreState()), phase: 'playing' as const }
    localStorage.setItem(
      saveKey('hearts'),
      JSON.stringify({ version: 2, gameId: 'hearts', savedAt: 100, state: heartsState }),
    )
    localStorage.setItem(
      saveKey('spades'),
      JSON.stringify({ version: 2, gameId: 'spades', savedAt: 500, state: spadesState }),
    )
    localStorage.setItem(
      saveKey('euchre'),
      JSON.stringify({ version: 2, gameId: 'euchre', savedAt: 300, state: euchreState }),
    )
    expect(getLatestSave()?.gameId).toBe('spades')
  })

  it('migrates legacy v1 key into hearts.v2', () => {
    const state = playingState()
    localStorage.setItem(
      'hearts.game.v1',
      JSON.stringify({ version: 1, savedAt: 123, state }),
    )
    const loaded = loadGame('hearts')
    expect(loaded).not.toBeNull()
    expect(loaded!.version).toBe(2)
    expect(localStorage.getItem('hearts.game.v1')).toBeNull()
  })
})

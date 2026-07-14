import { afterEach, describe, expect, it } from 'vitest'
import { clearGame, loadGame, saveGame } from './gameSave'
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

  it('clears finished euchre games', () => {
    let state = startEuchreGame(createEuchreState()) as EuchreState
    state = { ...state, phase: 'game_over' }
    saveGame(state, 'euchre')
    expect(loadGame('euchre')).toBeNull()
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

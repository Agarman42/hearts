import { afterEach, describe, expect, it } from 'vitest'
import { createInitialState as createHeartsState, startNewGame } from './games/hearts/engine'
import { saveGame } from './gameSave'
import { savePhaseHint } from './savePhaseHint'
import { saveKey } from './storageKeys'

describe('savePhaseHint', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('describes hearts passing phase', () => {
    const state = startNewGame(createHeartsState())
    saveGame(state, 'hearts')
    expect(savePhaseHint('hearts')).toMatch(/passing/i)
  })

  it('returns null when no save exists', () => {
    expect(savePhaseHint('spades')).toBeNull()
  })

  it('clears hint when save is removed', () => {
    const state = startNewGame(createHeartsState())
    saveGame(state, 'hearts')
    localStorage.removeItem(saveKey('hearts'))
    expect(savePhaseHint('hearts')).toBeNull()
  })
})
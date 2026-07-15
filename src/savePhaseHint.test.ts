import { afterEach, describe, expect, it } from 'vitest'
import { createInitialState as createHeartsState, startNewGame } from './games/hearts/engine'
import { createInitialState as createSpadesState } from './games/spades/engine'
import { createInitialState as createEuchreState } from './games/euchre/engine'
import { saveGame } from './gameSave'
import { loadPrefs, savePrefs } from './prefs'
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

  it('includes hearts running score for seat 0', () => {
    const state = startNewGame(createHeartsState())
    state.players[0].totalScore = 17
    saveGame(state, 'hearts')
    expect(savePhaseHint('hearts')).toMatch(/17 pts/)
  })

  it('includes spades team scores', () => {
    const state = createSpadesState()
    state.phase = 'bidding'
    state.handNumber = 2
    state.teamScores = { ns: 120, ew: 95 }
    saveGame(state, 'spades')
    expect(savePhaseHint('spades')).toMatch(/NS 120 · EW 95/)
  })

  it('includes capped euchre team scores', () => {
    const state = createEuchreState()
    state.phase = 'playing'
    state.handNumber = 4
    state.teamScores = { ns: 9, ew: 4 }
    state.rules.raceTo = 10
    saveGame(state, 'euchre')
    expect(savePhaseHint('euchre')).toMatch(/NS 9 · EW 4/)
  })

  it('shows best human score in pass-and-play hearts', () => {
    savePrefs({
      ...loadPrefs(),
      passAndPlay: true,
      humanSeats: { 0: true, 1: true, 2: false, 3: false },
    })
    const state = startNewGame(createHeartsState())
    state.players[0].totalScore = 30
    state.players[1].totalScore = 23
    saveGame(state, 'hearts')
    expect(savePhaseHint('hearts')).toMatch(/lead 23 pts/)
  })

  it('prefers saved pass-and-play seats over current prefs for hearts hints', () => {
    savePrefs({
      ...loadPrefs(),
      passAndPlay: false,
      humanSeats: { 0: true, 1: false, 2: false, 3: false },
    })
    const state = startNewGame(createHeartsState())
    state.players[0].totalScore = 30
    state.players[1].totalScore = 23
    saveGame(state, 'hearts', undefined, {
      passAndPlay: true,
      humanSeats: { 0: true, 1: true, 2: false, 3: false },
    })
    expect(savePhaseHint('hearts')).toMatch(/lead 23 pts/)
  })
})
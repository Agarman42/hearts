import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, savePrefs } from './prefs'

describe('prefs', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('round-trips activeGameId', () => {
    savePrefs({ ...DEFAULT_PREFS, activeGameId: 'euchre' })
    expect(loadPrefs().activeGameId).toBe('euchre')
  })

  it('defaults activeGameId to hearts', () => {
    expect(loadPrefs().activeGameId).toBe('hearts')
  })
})
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, normalizeSeatName, savePrefs } from './prefs'
import { prefsKey } from './storageKeys'

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

  it('keeps a custom player name across save/load', () => {
    savePrefs({
      ...DEFAULT_PREFS,
      seats: {
        ...DEFAULT_PREFS.seats,
        0: { ...DEFAULT_PREFS.seats[0], name: 'Mike' },
        2: { ...DEFAULT_PREFS.seats[2], name: 'Dad' },
      },
    })
    const loaded = loadPrefs()
    expect(loaded.seats[0].name).toBe('Mike')
    expect(loaded.seats[2].name).toBe('Dad')
    expect(loaded.seats[1].name).toBe('Angie')
  })

  it('round-trips four-color suits and treats a missing flag as off', () => {
    savePrefs({ ...DEFAULT_PREFS, fourColorSuits: true })
    expect(loadPrefs().fourColorSuits).toBe(true)

    const key = prefsKey('hearts')
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>
    delete raw.fourColorSuits
    localStorage.setItem(key, JSON.stringify(raw))
    expect(loadPrefs().fourColorSuits).toBe(false)
  })

  it('does not let a blank name wipe a custom name on reload', () => {
    savePrefs({
      ...DEFAULT_PREFS,
      seats: {
        ...DEFAULT_PREFS.seats,
        0: { ...DEFAULT_PREFS.seats[0], name: '   ' },
      },
    })
    expect(loadPrefs().seats[0].name).toBe('You')
  })
})

describe('normalizeSeatName', () => {
  it('trims and caps at 16 characters', () => {
    expect(normalizeSeatName('  AlexandraTheGreat  ', 'You')).toBe('AlexandraTheGrea')
  })

  it('keeps the previous name when the field is cleared', () => {
    expect(normalizeSeatName('   ', 'Mike')).toBe('Mike')
    expect(normalizeSeatName('', 'Angie')).toBe('Angie')
  })
})
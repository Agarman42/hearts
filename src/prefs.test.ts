import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, normalizeSeatName, savePrefs } from './prefs'

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
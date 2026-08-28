import { describe, expect, it } from 'vitest'
import { DEFAULT_HEARTS_RULES } from './hearts/types'
import { DEFAULT_SPADES_RULES } from './spades/types'
import { DEFAULT_EUCHRE_RULES } from './euchre/types'
import {
  HEARTS_HOUSE_PRESETS,
  SPADES_HOUSE_PRESETS,
  EUCHRE_HOUSE_PRESETS,
  activeHousePresetId,
  housePresetChips,
} from './tablePresets'

describe('house-rule presets', () => {
  it('Hearts Kitchen is the engine default', () => {
    const kitchen = HEARTS_HOUSE_PRESETS.find((p) => p.id === 'kitchen')!
    expect(kitchen.rules).toEqual(DEFAULT_HEARTS_RULES)
    expect(activeHousePresetId('hearts', DEFAULT_HEARTS_RULES)).toBe('kitchen')
  })

  it('Hearts Club turns on jack of diamonds', () => {
    const club = HEARTS_HOUSE_PRESETS.find((p) => p.id === 'club')!
    expect(club.rules.jackOfDiamonds).toBe(true)
    expect(club.rules.passCount).toBe(3)
  })

  it('Hearts No pass zeros passCount', () => {
    const none = HEARTS_HOUSE_PRESETS.find((p) => p.id === 'no-pass')!
    expect(none.rules.passCount).toBe(0)
  })

  it('Spades Kitchen is the engine default', () => {
    expect(activeHousePresetId('spades', DEFAULT_SPADES_RULES)).toBe('kitchen')
  })

  it('Spades Club enables blind nil', () => {
    const club = SPADES_HOUSE_PRESETS.find((p) => p.id === 'club')!
    expect(club.rules.blindNil).toBe(true)
    expect(club.rules.bagPenalty).toBe(true)
  })

  it('Spades No bags turns off bag penalty', () => {
    const none = SPADES_HOUSE_PRESETS.find((p) => p.id === 'no-bags')!
    expect(none.rules.bagPenalty).toBe(false)
  })

  it('Euchre Kitchen is the engine default', () => {
    expect(activeHousePresetId('euchre', DEFAULT_EUCHRE_RULES)).toBe('kitchen')
  })

  it('Euchre Casual turns off stick-the-dealer', () => {
    const casual = EUCHRE_HOUSE_PRESETS.find((p) => p.id === 'casual')!
    expect(casual.rules.stickTheDealer).toBe(false)
    expect(casual.rules.raceTo).toBe(10)
  })

  it('Euchre Race to 5 keeps loners', () => {
    const race = EUCHRE_HOUSE_PRESETS.find((p) => p.id === 'race-5')!
    expect(race.rules.raceTo).toBe(5)
    expect(race.rules.lonersEnabled).toBe(true)
  })

  it('marks a tweaked table as Custom', () => {
    expect(activeHousePresetId('hearts', { ...DEFAULT_HEARTS_RULES, raceTo: 75 })).toBeNull()
  })

  it('formatRoomRules chips cover each kitchen table', () => {
    expect(housePresetChips('hearts', 'kitchen').some((l) => l.includes('100'))).toBe(true)
    expect(housePresetChips('spades', 'kitchen').some((l) => l.includes('500'))).toBe(true)
    expect(housePresetChips('euchre', 'kitchen').some((l) => l.includes('Stick'))).toBe(true)
    expect(housePresetChips('spades', 'no-bags').some((l) => /Bags/.test(l))).toBe(false)
  })
})

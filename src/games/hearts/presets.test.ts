import { describe, expect, it } from 'vitest'
import { activeHeartsPresetId, HEARTS_PRESETS } from './presets'
import { DEFAULT_HEARTS_RULES } from './types'

describe('hearts presets', () => {
  it('recognizes the classic preset', () => {
    expect(activeHeartsPresetId(DEFAULT_HEARTS_RULES)).toBe('classic')
  })

  it('applies quick preset rules', () => {
    const quick = HEARTS_PRESETS.find((p) => p.id === 'quick')!
    expect(quick.rules.raceTo).toBe(50)
    expect(quick.rules.passCount).toBe(2)
    expect(activeHeartsPresetId(quick.rules)).toBe('quick')
  })

  it('returns null for custom mixes', () => {
    expect(activeHeartsPresetId({ ...DEFAULT_HEARTS_RULES, raceTo: 75 })).toBeNull()
  })
})
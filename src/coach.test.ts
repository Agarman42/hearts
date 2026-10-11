import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearCoachSeen, gameCoachTips, hasSeenCoach, markCoachSeen, shouldShowCoachTips } from './coach'
import { DEFAULT_PREFS } from './prefs'
import { coachKey, LEGACY_KEYS } from './storageKeys'

describe('per-game coach tips', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('tracks Hearts, Spades, and Euchre independently', () => {
    expect(hasSeenCoach('hearts')).toBe(false)
    expect(hasSeenCoach('spades')).toBe(false)
    expect(hasSeenCoach('euchre')).toBe(false)

    markCoachSeen('hearts')
    expect(hasSeenCoach('hearts')).toBe(true)
    expect(hasSeenCoach('spades')).toBe(false)
    expect(hasSeenCoach('euchre')).toBe(false)

    markCoachSeen('spades')
    expect(hasSeenCoach('euchre')).toBe(false)

    clearCoachSeen('hearts')
    expect(hasSeenCoach('hearts')).toBe(false)
    expect(hasSeenCoach('spades')).toBe(true)
  })

  it('migrates legacy Hearts coach flag', () => {
    localStorage.setItem(LEGACY_KEYS.coach, '1')
    expect(hasSeenCoach('hearts')).toBe(true)
    expect(localStorage.getItem(coachKey('hearts'))).toBe('1')
    expect(hasSeenCoach('spades')).toBe(false)
  })

  it('starts Hearts on the pass tip, and skips it when the deal does not pass', () => {
    expect(gameCoachTips('hearts', DEFAULT_PREFS, { heartsPassCount: 3 })[0]?.title).toBe(
      'Pass three',
    )
    const noPass = gameCoachTips('hearts', DEFAULT_PREFS, { heartsPassCount: 0 })
    expect(noPass[0]?.title).toBe('Play a card')
    expect(noPass.some((tip) => tip.title === 'Pass three')).toBe(false)
  })

  it('shouldShowCoachTips respects global toggle', () => {
    expect(shouldShowCoachTips('hearts', DEFAULT_PREFS)).toBe(true)
    expect(
      shouldShowCoachTips('hearts', { ...DEFAULT_PREFS, coachTipsEnabled: false }),
    ).toBe(false)
    markCoachSeen('hearts')
    expect(shouldShowCoachTips('hearts', DEFAULT_PREFS)).toBe(false)
  })
})
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearCoachSeen, hasSeenCoach, markCoachSeen } from './coach'
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
})
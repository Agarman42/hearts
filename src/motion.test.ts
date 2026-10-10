import { describe, expect, it } from 'vitest'
import { SPEED_TIMING } from './prefs'
import {
  DEAL_DECK_MS,
  DEAL_FAN_MS,
  DEAL_SEAT_MS,
  MOTION_CAP_MS,
  TRICK_SWEEP_MS,
  dealIntroMs,
  trickSweepEndMs,
} from './motion'

describe('table motion', () => {
  it('finishes the deal, the throw, and the trick sweep within 300 ms', () => {
    expect(dealIntroMs('fast')).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(dealIntroMs('normal')).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(dealIntroMs('slow')).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(dealIntroMs('instant')).toBe(0)
    expect(DEAL_FAN_MS).toBeGreaterThanOrEqual(150)
    expect(DEAL_FAN_MS).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(DEAL_SEAT_MS).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(DEAL_DECK_MS).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(trickSweepEndMs()).toBeLessThanOrEqual(MOTION_CAP_MS)
    expect(TRICK_SWEEP_MS).toBeGreaterThanOrEqual(150)
    for (const timing of Object.values(SPEED_TIMING)) {
      expect(timing.flightMs).toBeLessThanOrEqual(MOTION_CAP_MS)
      expect(timing.flightMs).toBeGreaterThan(0)
    }
  })
})

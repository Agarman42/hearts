import { describe, expect, it } from 'vitest'
import { SPADES_BID_RECAP_HOLD_MS } from './pacing'

describe('spades pacing', () => {
  it('keeps bid recap shorter than the old default', () => {
    expect(SPADES_BID_RECAP_HOLD_MS).toBeLessThan(3200)
    expect(SPADES_BID_RECAP_HOLD_MS).toBeGreaterThan(2000)
  })
})
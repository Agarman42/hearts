import { describe, expect, it } from 'vitest'
import { partnerSeat, preferredOpponentSeat, screenSlot } from './seats'

describe('seats', () => {
  it('rotates mySeat to South (slot 0)', () => {
    expect(screenSlot(2, 2)).toBe(0)
    expect(screenSlot(0, 2)).toBe(2)
  })

  it('partner is across', () => {
    expect(partnerSeat(0)).toBe(2)
    expect(partnerSeat(1)).toBe(3)
  })

  it('prefers clockwise opponent, then the other', () => {
    expect(preferredOpponentSeat(0, new Set())).toBe(1)
    expect(preferredOpponentSeat(0, new Set([1]))).toBe(3)
    expect(preferredOpponentSeat(0, new Set([1, 3]))).toBeNull()
  })
})

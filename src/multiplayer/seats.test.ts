import { describe, expect, it } from 'vitest'
import {
  engineSeatFromSlot,
  partnerSeat,
  preferredOpponentSeat,
  screenSlot,
  seatOfPlayer,
} from './seats'

describe('seats', () => {
  it('rotates mySeat to South (slot 0)', () => {
    expect(screenSlot(2, 2)).toBe(0)
    expect(screenSlot(0, 2)).toBe(2)
  })

  it('engineSeatFromSlot is the inverse of screenSlot', () => {
    expect(engineSeatFromSlot(0, 2)).toBe(2)
    expect(engineSeatFromSlot(2, 2)).toBe(0)
    expect(engineSeatFromSlot(screenSlot(3, 1), 1)).toBe(3)
  })

  it('seatOfPlayer follows playerId after a rotate, not compass south', () => {
    const chairs = {
      0: null,
      1: { playerId: 'joiner' },
      2: null,
      3: { playerId: 'host' },
    }
    expect(seatOfPlayer(chairs, 'host')).toBe(3)
    expect(screenSlot(0, 3)).toBe(1) // vacated south is visual left
    expect(screenSlot(3, 3)).toBe(0)
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

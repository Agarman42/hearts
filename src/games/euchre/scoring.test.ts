import { describe, expect, it } from 'vitest'
import { displayMatchScore } from './scoring'

describe('displayMatchScore', () => {
  it('caps displayed totals at race-to', () => {
    expect(displayMatchScore(11, 10)).toBe(10)
    expect(displayMatchScore(7, 10)).toBe(7)
    expect(displayMatchScore(10, 10)).toBe(10)
  })
})
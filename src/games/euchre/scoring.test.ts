import { describe, expect, it } from 'vitest'
import { displayMatchScore, lonerBlockedNearWin, pointsToWin } from './scoring'

describe('displayMatchScore', () => {
  it('caps displayed totals at race-to', () => {
    expect(displayMatchScore(11, 10)).toBe(10)
    expect(displayMatchScore(7, 10)).toBe(7)
    expect(displayMatchScore(10, 10)).toBe(10)
  })
})

describe('pointsToWin', () => {
  it('returns remaining points to reach race-to', () => {
    expect(pointsToWin(8, 10)).toBe(2)
    expect(pointsToWin(9, 10)).toBe(1)
    expect(pointsToWin(10, 10)).toBe(0)
  })
})

describe('lonerBlockedNearWin', () => {
  it('blocks loner when team needs two or fewer points', () => {
    expect(lonerBlockedNearWin('ns', { ns: 8, ew: 4 }, 10)).toBe(true)
    expect(lonerBlockedNearWin('ns', { ns: 9, ew: 4 }, 10)).toBe(true)
    expect(lonerBlockedNearWin('ew', { ns: 4, ew: 8 }, 10)).toBe(true)
  })

  it('allows loner when team needs three or more points', () => {
    expect(lonerBlockedNearWin('ns', { ns: 7, ew: 4 }, 10)).toBe(false)
    expect(lonerBlockedNearWin('ew', { ns: 2, ew: 5 }, 10)).toBe(false)
  })
})
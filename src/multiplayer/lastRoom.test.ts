import { afterEach, describe, expect, it } from 'vitest'
import {
  clearLastFriendsRoom,
  loadLastFriendsRoom,
  normalizeRoomCode,
  saveLastFriendsRoom,
} from './lastRoom'

describe('normalizeRoomCode', () => {
  it('uppercases and keeps only the safe alphabet', () => {
    expect(normalizeRoomCode('k7qm')).toBe('K7QM')
    expect(normalizeRoomCode('  k7-qm  ')).toBe('K7QM')
    expect(normalizeRoomCode('OIL1')).toBe('')
    expect(normalizeRoomCode('ab12cd')).toBe('AB2C')
  })
})

describe('last friends room', () => {
  afterEach(() => {
    clearLastFriendsRoom()
  })

  it('round-trips a saved room', () => {
    saveLastFriendsRoom({ code: 'k7qm', gameId: 'spades' })
    const loaded = loadLastFriendsRoom()
    expect(loaded?.code).toBe('K7QM')
    expect(loaded?.gameId).toBe('spades')
  })

  it('clears on leave', () => {
    saveLastFriendsRoom({ code: 'K7QM', gameId: 'hearts' })
    clearLastFriendsRoom()
    expect(loadLastFriendsRoom()).toBeNull()
  })
})

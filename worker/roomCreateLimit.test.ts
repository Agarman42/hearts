import { describe, expect, it } from 'vitest'
import { allowRoomCreate } from './roomCreateLimit'

describe('room create limit', () => {
  it('allows 20 creates an hour and refuses the 21st', () => {
    let hits: number[] = []
    for (let i = 0; i < 20; i++) {
      const next = allowRoomCreate(hits, 1_000 + i)
      expect(next.ok).toBe(true)
      hits = next.hits
    }
    const blocked = allowRoomCreate(hits, 2_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.hits).toHaveLength(20)
  })

  it('forgets creates older than an hour', () => {
    const first = allowRoomCreate([], 0)
    const later = allowRoomCreate(first.hits, 60 * 60 * 1000)
    expect(later.ok).toBe(true)
    expect(later.hits).toEqual([60 * 60 * 1000])
  })
})
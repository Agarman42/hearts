import { describe, expect, it } from 'vitest'
import { ROOM_CODE_ALPHABET, newRoomCode } from './codes'

describe('newRoomCode', () => {
  it('is 4 chars from the safe alphabet', () => {
    const code = newRoomCode(() => 0)
    expect(code).toHaveLength(4)
    for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch)
  })

  it('never uses 0 O 1 I', () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OI]/)
  })
})

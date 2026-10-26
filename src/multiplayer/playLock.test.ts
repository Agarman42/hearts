import { describe, expect, it } from 'vitest'
import { claimPlayLock } from './playLock'

describe('play lock', () => {
  it('keeps a second tap from sending another card', () => {
    const first = claimPlayLock(null, 'c1')
    expect(first.claimed).toBe(true)
    const second = claimPlayLock(first.held, 'c2')
    expect(second.claimed).toBe(false)
    expect(second.held).toBe('c1')
    expect(claimPlayLock(null, 'c2').claimed).toBe(true)
  })
})

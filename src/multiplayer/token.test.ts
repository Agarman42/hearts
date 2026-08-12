import { describe, expect, it } from 'vitest'
import { newPlayerToken } from './token'

describe('newPlayerToken', () => {
  it('encodes 16 bytes as 32 hex chars', () => {
    const bytes = new Uint8Array(16)
    bytes[0] = 0xab
    bytes[15] = 0xcd
    const token = newPlayerToken(() => bytes)
    expect(token).toHaveLength(32)
    expect(token).toMatch(/^[0-9a-f]{32}$/)
    expect(token.startsWith('ab')).toBe(true)
    expect(token.endsWith('cd')).toBe(true)
  })
})

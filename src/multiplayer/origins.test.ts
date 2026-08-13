import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from './origins'

describe('isAllowedOrigin', () => {
  it('allows Pages and local Vite', () => {
    expect(isAllowedOrigin('https://agarman42.github.io')).toBe(true)
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
    expect(isAllowedOrigin('http://192.168.1.20:5173')).toBe(true)
  })

  it('rejects unknown hosts', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
    expect(isAllowedOrigin(null)).toBe(false)
  })
})

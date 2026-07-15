import { describe, expect, it, beforeEach } from 'vitest'
import { humorActive, setHumorConfig, withHumor } from './humor'

describe('humor intensity', () => {
  beforeEach(() => {
    setHumorConfig(false, 'chaos')
  })

  it('humorActive is false when humor is off', () => {
    setHumorConfig(false, 'chaos')
    expect(humorActive(() => 0)).toBe(false)
  })

  it('chaos always passes the active gate', () => {
    setHumorConfig(true, 'chaos')
    expect(humorActive(() => 0.99)).toBe(true)
  })

  it('mild skips some beats', () => {
    setHumorConfig(true, 'mild')
    expect(humorActive(() => 0.1)).toBe(true)
    expect(humorActive(() => 0.9)).toBe(false)
  })

  it('withHumor swaps in the line when humor is on', () => {
    setHumorConfig(true, 'chaos')
    expect(withHumor('plain', () => 'funny', true)).toBe('funny')
    expect(withHumor('plain', () => 'funny', false)).toBe('plain')
  })
})
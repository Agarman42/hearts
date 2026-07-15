import { describe, expect, it } from 'vitest'
import { isGameHookPaused } from './gamePause'

describe('isGameHookPaused', () => {
  it('pauses when not on the table screen', () => {
    expect(isGameHookPaused('hearts', 'home', 'hearts')).toBe(true)
    expect(isGameHookPaused('hearts', 'settings', 'hearts')).toBe(true)
    expect(isGameHookPaused('hearts', 'stats', 'hearts')).toBe(true)
  })

  it('runs only the active game on the table screen', () => {
    expect(isGameHookPaused('hearts', 'table', 'hearts')).toBe(false)
    expect(isGameHookPaused('hearts', 'table', 'spades')).toBe(true)
    expect(isGameHookPaused('spades', 'table', 'euchre')).toBe(true)
  })
})
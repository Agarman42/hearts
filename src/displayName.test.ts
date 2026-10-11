import { describe, expect, it } from 'vitest'
import { cleanDisplayName } from './displayName'

describe('cleanDisplayName', () => {
  it('keeps a normal name and trims it', () => {
    expect(cleanDisplayName('  Ada  ')).toBe('Ada')
    expect(cleanDisplayName('Mary Anne')).toBe('Mary Anne')
  })

  it('caps the length at 16 characters', () => {
    expect(cleanDisplayName('Abcdefghijklmnopqr')).toBe('Abcdefghijklmnop')
  })

  it('replaces a blank name', () => {
    expect(cleanDisplayName('   ')).toBe('Player')
  })

  it('replaces reserved table words', () => {
    expect(cleanDisplayName('You')).toBe('Player')
    expect(cleanDisplayName('you', { keepYou: true })).toBe('you')
    expect(cleanDisplayName('North')).toBe('Player')
    expect(cleanDisplayName('Dealer')).toBe('Player')
  })

  it('replaces blocked words, including spaced and leetspeak forms', () => {
    expect(cleanDisplayName('f4ck')).toBe('Player')
    expect(cleanDisplayName('f.u.c.k')).toBe('Player')
    expect(cleanDisplayName('sh1t')).toBe('Player')
    expect(cleanDisplayName('d1ck')).toBe('Player')
  })

  it('does not flag ordinary words that only share a fragment', () => {
    expect(cleanDisplayName('classic')).toBe('classic')
    expect(cleanDisplayName('Dickens')).toBe('Dickens')
    expect(cleanDisplayName('hello')).toBe('hello')
    expect(cleanDisplayName('spice')).toBe('spice')
  })
})

import { describe, expect, it } from 'vitest'
import { nextHandCardId } from './handKeys'

const ids = ['a', 'b', 'c']

describe('nextHandCardId', () => {
  it('moves right and wraps to the first card', () => {
    expect(nextHandCardId(ids, 'a', 'ArrowRight')).toBe('b')
    expect(nextHandCardId(ids, 'c', 'ArrowRight')).toBe('a')
  })

  it('moves left and wraps to the last card', () => {
    expect(nextHandCardId(ids, 'b', 'ArrowLeft')).toBe('a')
    expect(nextHandCardId(ids, 'a', 'ArrowLeft')).toBe('c')
  })

  it('jumps to the ends', () => {
    expect(nextHandCardId(ids, 'b', 'Home')).toBe('a')
    expect(nextHandCardId(ids, 'b', 'End')).toBe('c')
  })

  it('starts at an end when nothing is selected', () => {
    expect(nextHandCardId(ids, null, 'ArrowRight')).toBe('a')
    expect(nextHandCardId(ids, null, 'ArrowLeft')).toBe('c')
    expect(nextHandCardId([], 'a', 'ArrowRight')).toBeNull()
  })
})

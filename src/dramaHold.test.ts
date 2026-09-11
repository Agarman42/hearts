import { describe, expect, it } from 'vitest'
import { dramaHoldMs, isHandEndDramaKind, isNegativeDramaKind } from './dramaHold'

describe('dramaHoldMs', () => {
  it('caps negative set/euchre banners at 1500ms on fast/normal', () => {
    expect(dramaHoldMs('negative', { gameSpeed: 'fast' })).toBe(1500)
    expect(dramaHoldMs('negative', { gameSpeed: 'normal' })).toBe(1500)
  })

  it('caps celebrate march/loner at 2200ms', () => {
    expect(dramaHoldMs('celebrate', { gameSpeed: 'fast' })).toBe(2200)
  })

  it('uses 1000ms on instant', () => {
    expect(dramaHoldMs('negative', { gameSpeed: 'instant' })).toBe(1000)
    expect(dramaHoldMs('celebrate', { gameSpeed: 'instant' })).toBe(1000)
  })

  it('snaps off for skipRecaps and reduceMotion', () => {
    expect(dramaHoldMs('negative', { skipRecaps: true })).toBe(0)
    expect(dramaHoldMs('celebrate', { reduceMotion: true })).toBe(0)
  })

  it('classifies hand-end leftovers that must clear on next bid', () => {
    expect(isNegativeDramaKind('euchre')).toBe(true)
    expect(isNegativeDramaKind('set')).toBe(true)
    expect(isHandEndDramaKind('march')).toBe(true)
    expect(isHandEndDramaKind('trump')).toBe(false)
  })
})

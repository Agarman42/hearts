import { describe, expect, it } from 'vitest'
import { handFanTiltRad, layoutHandFan } from './handFan'

function visualWidth(width: number, size: 'small' | 'medium' | 'large' = 'medium') {
  const layout = layoutHandFan(width, 13, true, size)
  const overhang = Math.sin(handFanTiltRad(13)) * layout.cardH
  return { layout, visual: layout.fanWidth + overhang * 2 }
}

describe('layoutHandFan', () => {
  it('keeps a 13-card fan, including the rotated corners, inside a phone rail', () => {
    for (const width of [320, 360, 390, 430]) {
      for (const size of ['small', 'medium', 'large'] as const) {
        const { layout, visual } = visualWidth(width, size)
        expect(visual, `${size} ${width}`).toBeLessThanOrEqual(width + 0.5)
        expect(layout.cardW, `${size} ${width}`).toBeGreaterThan(48)
      }
    }
  })

  it('makes Large faces wider than Standard, and Compact narrower', () => {
    for (const width of [360, 390, 430]) {
      const small = layoutHandFan(width, 13, false, 'small')
      const medium = layoutHandFan(width, 13, false, 'medium')
      const large = layoutHandFan(width, 13, false, 'large')
      expect(large.cardW, `large ${width}`).toBeGreaterThan(medium.cardW + 4)
      expect(small.cardW, `small ${width}`).toBeLessThan(medium.cardW - 2)
    }
  })

  it('keeps a short Euchre hand large', () => {
    const layout = layoutHandFan(390, 5, false)
    expect(layout.cardW).toBeGreaterThan(80)
    expect(layout.fanWidth).toBeLessThanOrEqual(390)
  })

  it('keeps a short hand inside the rail after the end cards tilt', () => {
    for (const count of [5, 7, 9]) {
      for (const width of [360, 390, 430]) {
        for (const size of ['small', 'medium', 'large'] as const) {
          const layout = layoutHandFan(width, count, false, size)
          const overhang = Math.sin(handFanTiltRad(count)) * layout.cardH
          expect(layout.fanWidth + overhang * 2, `${size} ${count} at ${width}`).toBeLessThanOrEqual(
            width + 0.5,
          )
        }
      }
    }
  })
})
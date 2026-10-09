import { describe, expect, it } from 'vitest'
import { handFanTiltRad, layoutHandFan } from './handFan'

describe('layoutHandFan', () => {
  it('keeps a 13-card fan, including the rotated corners, inside a phone rail', () => {
    for (const width of [320, 360, 390, 430]) {
      const layout = layoutHandFan(width, 13, true)
      const overhang = Math.sin(handFanTiltRad(13)) * layout.cardH
      expect(layout.fanWidth + overhang * 2, `width ${width}`).toBeLessThanOrEqual(width + 0.5)
      expect(layout.cardW).toBeGreaterThan(48)
    }
  })

  it('keeps a short Euchre hand large', () => {
    const layout = layoutHandFan(390, 5, false)
    expect(layout.cardW).toBeGreaterThan(80)
    expect(layout.fanWidth).toBeLessThanOrEqual(390)
  })
})
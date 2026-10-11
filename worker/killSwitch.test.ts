import { describe, expect, it } from 'vitest'
import { roomsDisabled } from './killSwitch'

describe('rooms kill switch', () => {
  it('stays off unless the var is explicitly on', () => {
    expect(roomsDisabled(undefined)).toBe(false)
    expect(roomsDisabled({})).toBe(false)
    expect(roomsDisabled({ ROOMS_DISABLED: '0' })).toBe(false)
    expect(roomsDisabled({ ROOMS_DISABLED: '' })).toBe(false)
    expect(roomsDisabled({ ROOMS_DISABLED: 'no' })).toBe(false)
  })

  it('turns on for 1, true, or yes', () => {
    expect(roomsDisabled({ ROOMS_DISABLED: '1' })).toBe(true)
    expect(roomsDisabled({ ROOMS_DISABLED: 'true' })).toBe(true)
    expect(roomsDisabled({ ROOMS_DISABLED: ' YES ' })).toBe(true)
  })
})

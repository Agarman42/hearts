import { describe, expect, it } from 'vitest'
import {
  awayLine,
  backLine,
  clockLine,
  computerSeatLabel,
  linkLine,
  partnerLine,
  pausedRoomsLine,
  tooManyRoomsLine,
  watchingLine,
} from './tableStatus'

describe('friends table status lines', () => {
  it('keeps the away line to one sentence', () => {
    expect(awayLine('Ben')).toBe('Ben stepped away.')
  })

  it('uses a different line before the first connection and after a drop', () => {
    expect(linkLine(false)).toBe('Connecting…')
    expect(linkLine(true)).toBe('Reconnecting…')
    expect(backLine()).toBe('Back at the table.')
  })

  it('names the partner and the computer the same way in every game', () => {
    expect(partnerLine()).toBe('You and North are partners.')
    expect(computerSeatLabel()).toBe('Computer')
    expect(watchingLine()).toBe('You’re watching. The computer has this seat.')
  })

  it('says who sets the turn limit', () => {
    expect(clockLine(true)).toBe('You set how long a turn lasts.')
    expect(clockLine(false)).toBe('The host sets the turn limit.')
  })

  it('repeats the room-create limits in plain words', () => {
    expect(pausedRoomsLine()).toMatch(/paused/i)
    expect(tooManyRoomsLine()).toMatch(/too many rooms/i)
  })
})
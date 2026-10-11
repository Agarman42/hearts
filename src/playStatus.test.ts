import { describe, expect, it } from 'vitest'
import { seatPlayCue } from './playStatus'

const you = { whoseTurn: 0, you: 0, name: 'You', isHuman: true, online: false }

describe('seatPlayCue', () => {
  it('stays on your own turn while a card is in the air', () => {
    expect(seatPlayCue(you).kind).toBe('you')
    expect(seatPlayCue({ ...you, online: true }).kind).toBe('you')
  })

  it('tells pass-and-play to hand the device to the other person', () => {
    expect(
      seatPlayCue({ whoseTurn: 1, you: 0, name: 'Heather', isHuman: true, online: false }),
    ).toEqual({ kind: 'pass', text: 'Pass the device to Heather' })
  })

  it('waits for another person at an online table', () => {
    const cue = seatPlayCue({
      whoseTurn: 2,
      you: 0,
      name: 'Scott',
      isHuman: true,
      online: true,
    })
    expect(cue).toEqual({ kind: 'wait', text: 'Waiting for Scott' })
  })

  it('names the computer when it is the computer’s turn', () => {
    expect(
      seatPlayCue({ whoseTurn: 3, you: 0, name: 'Angie', isHuman: false, online: false }),
    ).toEqual({ kind: 'think', name: 'Angie' })
  })
})

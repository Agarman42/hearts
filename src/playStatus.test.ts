import { describe, expect, it } from 'vitest'
import { euchreBidStatus, heartsPassStatus, seatPlayCue } from './playStatus'

const you = { whoseTurn: 0, you: 0, name: 'You', isHuman: true, online: false }

describe('table moments', () => {
  it('names the Hearts pass direction', () => {
    expect(heartsPassStatus({ passCount: 3, direction: 'left', confirmed: false })).toBe('Pass 3 left')
    expect(heartsPassStatus({ passCount: 3, direction: 'left', confirmed: true })).toBe(
      'Waiting for the others to pass',
    )
  })

  it('says who is naming Euchre trump, including stick the dealer', () => {
    expect(euchreBidStatus({ yourTurn: false, name: 'Ada', round: 1, mustName: false })).toBe(
      "Ada's bid — order up or pass",
    )
    expect(euchreBidStatus({ yourTurn: true, name: 'Ada', round: 2, mustName: false })).toBe(
      'Your bid — name trump or pass',
    )
    expect(euchreBidStatus({ yourTurn: true, name: 'Ada', round: 2, mustName: true })).toBe(
      'Stick the dealer — you have to name trump',
    )
  })
})

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

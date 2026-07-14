import { describe, expect, it } from 'vitest'
import { createInitialState as createHearts } from './games/hearts/engine'
import { DEFAULT_PREFS } from './prefs'
import {
  applyHumanSeats,
  humanSeats,
  isHumanControlled,
  needsPassPrompt,
  uiSeat,
} from './passAndPlay'

describe('humanSeats', () => {
  it('returns only seat 0 when pass-and-play is off', () => {
    expect(humanSeats({ passAndPlay: false, humanSeats: DEFAULT_PREFS.humanSeats })).toEqual([0])
  })

  it('returns checked seats when pass-and-play is on', () => {
    const seats = { 0: true, 1: true, 2: false, 3: true } as const
    expect(humanSeats({ passAndPlay: true, humanSeats: seats })).toEqual([0, 1, 3])
  })

  it('falls back to seat 0 if no seats checked', () => {
    const seats = { 0: false, 1: false, 2: false, 3: false } as const
    expect(humanSeats({ passAndPlay: true, humanSeats: seats })).toEqual([0])
  })
})

describe('uiSeat', () => {
  const pp = {
    passAndPlay: true,
    humanSeats: { 0: true, 1: false, 2: true, 3: false },
  }

  it('shows current human turn at south', () => {
    expect(uiSeat({ whoseTurn: 2 }, pp)).toBe(2)
  })

  it('defaults to primary human when turn is AI', () => {
    expect(uiSeat({ whoseTurn: 1 }, pp)).toBe(0)
  })

  it('returns seat 0 when pass-and-play is off', () => {
    expect(uiSeat({ whoseTurn: 2 }, { passAndPlay: false, humanSeats: pp.humanSeats })).toBe(0)
  })
})

describe('needsPassPrompt', () => {
  const pp = {
    passAndPlay: true,
    humanSeats: { 0: true, 1: true, 2: false, 3: false },
  }

  it('prompts when human turn is not acknowledged', () => {
    expect(needsPassPrompt({ whoseTurn: 1 }, pp, null)).toBe(true)
    expect(needsPassPrompt({ whoseTurn: 1 }, pp, 1)).toBe(false)
  })

  it('skips AI turns and single-human mode', () => {
    expect(needsPassPrompt({ whoseTurn: 2 }, pp, null)).toBe(false)
    expect(needsPassPrompt({ whoseTurn: 1 }, { passAndPlay: false, humanSeats: pp.humanSeats }, null)).toBe(
      false,
    )
  })
})

describe('applyHumanSeats', () => {
  it('marks configured seats as human in game state', () => {
    const state = createHearts(DEFAULT_PREFS)
    const next = applyHumanSeats(state, {
      passAndPlay: true,
      humanSeats: { 0: true, 1: true, 2: false, 3: false },
    })
    expect(next.players[0].isHuman).toBe(true)
    expect(next.players[1].isHuman).toBe(true)
    expect(next.players[2].isHuman).toBe(false)
    expect(isHumanControlled(1, { passAndPlay: true, humanSeats: { 0: true, 1: true, 2: false, 3: false } })).toBe(
      true,
    )
  })
})
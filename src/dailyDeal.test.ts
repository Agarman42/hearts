import { describe, expect, it } from 'vitest'
import { dailyDealSeed, mulberry32, utcDateKey } from './dailyDeal'
import { createInitialState, dealHand, startNewGame } from './games/hearts/engine'
import {
  createInitialState as createSpades,
  dealHand as dealSpades,
  startNewGame as startSpades,
} from './games/spades/engine'
import {
  createInitialState as createEuchre,
  dealHand as dealEuchreState,
  startNewGame as startEuchre,
} from './games/euchre/engine'

function southHand(dateKey: string, hands = 1): string[] {
  let state = startNewGame(createInitialState(), undefined, { dealSeed: dateKey })
  for (let i = 1; i < hands; i++) state = dealHand(state)
  return state.players[0].hand.map((card) => card.id)
}

describe('daily Hearts deal', () => {
  it('uses the UTC date', () => {
    expect(utcDateKey(new Date('2026-10-11T03:30:00Z'))).toBe('2026-10-11')
    expect(utcDateKey(new Date('2026-10-11T23:30:00Z'))).toBe('2026-10-11')
  })

  it('deals the same cards for the same day, including the next hand', () => {
    expect(southHand('2026-10-11')).toEqual(southHand('2026-10-11'))
    expect(southHand('2026-10-11', 2)).toEqual(southHand('2026-10-11', 2))
    expect(southHand('2026-10-11')).not.toEqual(southHand('2026-10-12'))
    expect(southHand('2026-10-11')).not.toEqual(southHand('2026-10-11', 2))
    expect(southHand('2026-10-11')).toHaveLength(13)
  })

  it('leaves an ordinary deal unseeded', () => {
    const state = startNewGame(createInitialState())
    expect(state.dealSeed).toBeNull()
    expect(state.players[0].hand).toHaveLength(13)
  })

  it('deals the same Spades and Euchre cards for the same day', () => {
    const spades = (date: string, hands = 1) => {
      let state = startSpades(createSpades(), undefined, { dealSeed: date })
      for (let i = 1; i < hands; i++) state = dealSpades(state)
      return state.players[0].hand.map((card) => card.id)
    }
    expect(spades('2026-10-11')).toEqual(spades('2026-10-11'))
    expect(spades('2026-10-11', 2)).toEqual(spades('2026-10-11', 2))
    expect(spades('2026-10-11')).not.toEqual(spades('2026-10-12'))
    expect(spades('2026-10-11')).toHaveLength(13)
    expect(startSpades(createSpades()).dealSeed).toBeNull()

    const euchre = (date: string, hands = 1) => {
      let state = startEuchre(createEuchre(), undefined, { dealSeed: date })
      for (let i = 1; i < hands; i++) state = dealEuchreState(state)
      return {
        hand: state.players[0].hand.map((card) => card.id),
        upcard: state.upcard?.id,
      }
    }
    expect(euchre('2026-10-11')).toEqual(euchre('2026-10-11'))
    expect(euchre('2026-10-11', 2)).toEqual(euchre('2026-10-11', 2))
    expect(euchre('2026-10-11')).not.toEqual(euchre('2026-10-12'))
    expect(euchre('2026-10-11').hand).toHaveLength(5)
    expect(startEuchre(createEuchre()).dealSeed).toBeNull()
  })

  it('changes the shuffle when the seed changes', () => {
    const first = mulberry32(dailyDealSeed('hearts', '2026-10-11', 1))()
    const second = mulberry32(dailyDealSeed('hearts', '2026-10-12', 1))()
    expect(first).not.toBe(second)
  })
})
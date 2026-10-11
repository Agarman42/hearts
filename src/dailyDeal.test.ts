import { describe, expect, it } from 'vitest'
import { dailyDealSeed, mulberry32, utcDateKey } from './dailyDeal'
import { createInitialState, dealHand, startNewGame } from './games/hearts/engine'

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

  it('changes the shuffle when the seed changes', () => {
    const first = mulberry32(dailyDealSeed('hearts', '2026-10-11', 1))()
    const second = mulberry32(dailyDealSeed('hearts', '2026-10-12', 1))()
    expect(first).not.toBe(second)
  })
})
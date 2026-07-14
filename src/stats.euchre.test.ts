import { afterEach, describe, expect, it } from 'vitest'
import {
  euchreEuchreRate,
  euchreOrderRate,
  loadStats,
  recordEuchreHandEnd,
  resetStats,
} from './stats'

afterEach(() => {
  resetStats('euchre')
})

describe('recordEuchreHandEnd', () => {
  it('tracks orders, euchres, and marches', () => {
    recordEuchreHandEnd({
      humanOrdered: true,
      humanTeamMaker: true,
      makerTricks: 3,
      marched: false,
      euchred: false,
      defendedEuchre: false,
      loner: false,
    })
    recordEuchreHandEnd({
      humanOrdered: false,
      humanTeamMaker: false,
      makerTricks: 2,
      marched: false,
      euchred: true,
      defendedEuchre: true,
      loner: false,
    })
    recordEuchreHandEnd({
      humanOrdered: true,
      humanTeamMaker: true,
      makerTricks: 5,
      marched: true,
      euchred: false,
      defendedEuchre: false,
      loner: true,
    })

    const s = loadStats('euchre')
    expect(s.handsPlayed).toBe(3)
    expect(s.ordersMade).toBe(2)
    expect(s.ordersFailed).toBe(0)
    expect(s.euchresMade).toBe(1)
    expect(s.marchesMade).toBe(1)
    expect(s.lonersMade).toBe(1)
    expect(euchreOrderRate(s)).toBe(100)
    expect(euchreEuchreRate(s)).toBeCloseTo(33.3, 1)
  })
})
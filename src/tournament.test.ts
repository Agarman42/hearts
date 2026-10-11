import { describe, expect, it } from 'vitest'
import {
  advanceNight,
  createNight,
  enterScore,
  loadNight,
  nightResultsText,
  planNight,
  rememberNight,
  standings,
} from './tournament'

function partnerKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

describe('euchre night schedule', () => {
  for (const count of [12, 16, 20]) {
    it(`seats ${count} players for six rounds with no repeat partners`, () => {
      const rounds = planNight(count)
      expect(rounds).toHaveLength(6)
      const seenPairs = new Set<string>()
      for (const round of rounds) {
        expect(round.tables).toHaveLength(count / 4)
        const seen = new Set<number>()
        for (const table of round.tables) {
          const [north, east, south, west] = table.seats
          for (const seat of table.seats) {
            expect(seen.has(seat)).toBe(false)
            seen.add(seat)
          }
          for (const [a, b] of [
            [north, south],
            [east, west],
          ] as const) {
            const key = partnerKey(a, b)
            expect(seenPairs.has(key)).toBe(false)
            seenPairs.add(key)
          }
        }
        expect(seen.size).toBe(count)
      }
    })
  }

  it('refuses a size that is not a full night', () => {
    expect(() => planNight(8)).toThrow(/12, 16, or 20/)
  })
})

describe('a full 20-player night', () => {
  it('scores every table and ranks the room', () => {
    const names = Array.from({ length: 20 }, (_, i) => `Player ${i + 1}`)
    let night = createNight(names)
    for (let round = 0; round < 6; round++) {
      expect(night.currentRound).toBe(round)
      for (let table = 0; table < 5; table++) {
        const score = table === 0 ? { ns: 4, ew: 10 } : { ns: 10, ew: 6 }
        night = enterScore(night, table, score)
      }
      night = advanceNight(night)
    }
    expect(night.complete).toBe(true)
    const board = standings(night)
    expect(board).toHaveLength(20)
    expect(board[0].points).toBeGreaterThanOrEqual(board[19].points)
    const total = board.reduce((sum, row) => sum + row.points, 0)
    expect(total).toBe(936)
    const text = nightResultsText(night)
    expect(text).toContain('Euchre night')
    expect(text).toContain('Player 1')
    expect(text).toContain('936')
    expect(text).not.toMatch(/[♥♠♦♣]|queen|bower/i)
  })

  it('will not advance while a table is blank', () => {
    const names = Array.from({ length: 12 }, (_, i) => `Player ${i + 1}`)
    const started = createNight(names)
    const stuck = advanceNight(enterScore(started, 0, { ns: 10, ew: 7 }))
    expect(stuck.currentRound).toBe(0)
    expect(stuck.complete).toBe(false)
  })

  it('remembers the night on this phone and ignores junk', () => {
    localStorage.clear()
    expect(loadNight()).toBeNull()
    const night = createNight(Array.from({ length: 12 }, (_, i) => `Player ${i + 1}`))
    rememberNight(night)
    expect(loadNight()?.names).toEqual(night.names)
    localStorage.setItem('cardparlour.euchreNight.v1', '{')
    expect(loadNight()).toBeNull()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { saveAchievements } from './achievements'
import { saveSpadesAchievements } from './achievements/spades'
import { recordMatchEnd } from './stats'
import { checkTrophyCase, trophyProgress } from './trophyCase'

describe('trophyProgress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('tracks marathon player hands', () => {
    const p = trophyProgress('marathon_player')
    expect(p).toEqual({ current: 0, target: 500 })
  })

  it('tracks achievement hunter', () => {
    const batch: Record<string, number> = {}
    for (let i = 0; i < 10; i++) batch[`h_${i}`] = Date.now()
    saveAchievements(batch, 'hearts')
    saveSpadesAchievements({ sp_nil: Date.now() })
    const p = trophyProgress('achievement_hunter')
    expect(p?.current).toBe(11)
    expect(p?.target).toBe(25)
  })

  it('returns null for unlocked trophies', () => {
    recordMatchEnd(
      {
        humanWon: true,
        humanScore: 10,
        winnerScore: 10,
        handsInMatch: 5,
        moonsInMatch: 0,
        cleanHandsInMatch: 0,
      },
      'spades',
    )
    checkTrophyCase()
    expect(trophyProgress('partner_up')).toBeNull()
  })
})
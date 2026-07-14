import { beforeEach, describe, expect, it } from 'vitest'
import { saveAchievements } from './achievements'
import { checkGlobalAchievements, countAllUnlockedAchievements } from './achievements/global'
import { saveEuchreAchievements } from './achievements/euchre'
import { saveSpadesAchievements } from './achievements/spades'
import { achievementsKey } from './storageKeys'
import { checkTrophyCase } from './trophyCase'

describe('cross-game achievements', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('counts unlocks across all games', () => {
    saveAchievements({ first_win: Date.now() }, 'hearts')
    saveSpadesAchievements({ sp_first_win: Date.now() })
    saveEuchreAchievements({ eu_first_win: Date.now() })
    expect(countAllUnlockedAchievements()).toBe(3)
  })

  it('unlocks collector at 15 cross-game achievements', () => {
    const batch: Record<string, number> = {}
    for (let i = 0; i < 14; i++) batch[`h_${i}`] = Date.now()
    saveAchievements(batch, 'hearts')
    saveSpadesAchievements({ sp_nil: Date.now() })
    const unlocked = checkGlobalAchievements()
    expect(unlocked.some((a) => a.id === 'collector')).toBe(true)
    expect(localStorage.getItem(achievementsKey('hearts'))).toContain('collector')
  })

  it('checks new global trophies', () => {
    const hearts: Record<string, number> = {}
    const spades: Record<string, number> = {}
    const euchre: Record<string, number> = {}
    for (let i = 0; i < 15; i++) hearts[`h_${i}`] = Date.now()
    for (let i = 0; i < 6; i++) spades[`s_${i}`] = Date.now()
    for (let i = 0; i < 4; i++) euchre[`e_${i}`] = Date.now()
    saveAchievements(hearts, 'hearts')
    saveSpadesAchievements(spades)
    saveEuchreAchievements(euchre)
    const trophies = checkTrophyCase()
    expect(trophies.some((t) => t.id === 'achievement_hunter')).toBe(true)
  })
})
import { afterEach, describe, expect, it } from 'vitest'
import { checkHandAchievements } from './achievements'
import { achievementsKey, statsKey } from './storageKeys'
import { EMPTY_STATS, saveStats } from './stats'

afterEach(() => {
  localStorage.removeItem(statsKey('hearts'))
  localStorage.removeItem(achievementsKey('hearts'))
})

describe('checkHandAchievements', () => {
  it('unlocks first_hand after the first completed hand', () => {
    const stats = { ...EMPTY_STATS, handsPlayed: 1, queenFreeStreak: 1 }
    const unlocked = checkHandAchievements(
      {
        humanPoints: 5,
        humanTookQueen: false,
        moonShooter: null,
        zeroHandsThisMatch: 0,
        queenFreeHandsThisMatch: 1,
        matchHadOpponentMoon: false,
        maxDeficitThisMatch: 0,
      },
      stats,
    )
    expect(unlocked.some((a) => a.id === 'first_hand')).toBe(true)
  })

  it('unlocks queen_immune at 20 consecutive queen-free hands', () => {
    const stats = { ...EMPTY_STATS, handsPlayed: 20, queenFreeStreak: 20 }
    const unlocked = checkHandAchievements(
      {
        humanPoints: 3,
        humanTookQueen: false,
        moonShooter: null,
        zeroHandsThisMatch: 0,
        queenFreeHandsThisMatch: 20,
        matchHadOpponentMoon: false,
        maxDeficitThisMatch: 0,
      },
      stats,
    )
    expect(unlocked.some((a) => a.id === 'queen_immune')).toBe(true)
  })
})

describe('recordHandEnd queen streak', () => {
  it('resets queenFreeStreak when Q♠ is taken', async () => {
    const { recordHandEnd, loadStats } = await import('./stats')
    saveStats({ ...EMPTY_STATS, queenFreeStreak: 5 }, 'hearts')
    recordHandEnd({ humanPoints: 13, humanTookQueen: true, moonShooter: null }, 'hearts')
    expect(loadStats('hearts').queenFreeStreak).toBe(0)
  })
})
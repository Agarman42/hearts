import { describe, expect, it } from 'vitest'
import {
  dailyButtonSubtitle,
  dailyResultText,
  emptyDailyStreaks,
  loadDailyStreaks,
  noteDailyPlay,
  rememberDailyPlay,
} from './dailyResult'

describe('daily result streak', () => {
  it('starts at one and stays there on the same day', () => {
    const first = noteDailyPlay(emptyDailyStreaks(), 'hearts', '2026-10-11')
    expect(first.book.hearts).toEqual({ last: '2026-10-11', count: 1 })
    const again = noteDailyPlay(first.book, 'hearts', '2026-10-11')
    expect(again.book.hearts?.count).toBe(1)
    expect(again.already).toBe(true)
  })

  it('grows on the next UTC day and resets after a gap', () => {
    const day1 = noteDailyPlay(emptyDailyStreaks(), 'spades', '2026-10-11')
    const day2 = noteDailyPlay(day1.book, 'spades', '2026-10-12')
    expect(day2.book.spades).toEqual({ last: '2026-10-12', count: 2 })
    const later = noteDailyPlay(day2.book, 'spades', '2026-10-14')
    expect(later.book.spades).toEqual({ last: '2026-10-14', count: 1 })
  })

  it('counts October 31 and November 1 as one streak', () => {
    const oct = noteDailyPlay(emptyDailyStreaks(), 'hearts', '2026-10-31')
    const nov = noteDailyPlay(oct.book, 'hearts', '2026-11-01')
    expect(nov.book.hearts).toEqual({ last: '2026-11-01', count: 2 })
  })

  it('keeps each game on its own streak and ignores an older day', () => {
    const hearts = noteDailyPlay(emptyDailyStreaks(), 'hearts', '2026-10-11')
    const both = noteDailyPlay(hearts.book, 'euchre', '2026-10-11')
    expect(both.book.hearts?.count).toBe(1)
    expect(both.book.euchre?.count).toBe(1)
    const older = noteDailyPlay(both.book, 'hearts', '2026-10-10')
    expect(older.book.hearts).toEqual({ last: '2026-10-11', count: 1 })
  })
})

describe('daily result card', () => {
  it('shares the score and streak without naming cards', () => {
    const text = dailyResultText({
      game: 'Hearts',
      dateKey: '2026-10-11',
      yourScore: 7,
      streak: 3,
    })
    expect(text).toContain('Card Parlour · Today\'s Hearts hand')
    expect(text).toContain('2026-10-11')
    expect(text).toContain('Score 7')
    expect(text).toContain('Streak 3')
    expect(text).toContain('https://agarman42.github.io/hearts/')
    expect(text).not.toMatch(/[♥♠♦♣]|queen|bower|ace|king|jack|nil|bag/i)
  })

  it('puts the streak on the home button only after a day is kept', () => {
    expect(dailyButtonSubtitle(0)).toBe('Same cards for every player today')
    expect(dailyButtonSubtitle(4)).toBe('Same cards today · streak 4')
  })

  it('remembers the streak on this phone and ignores junk', () => {
    localStorage.clear()
    expect(loadDailyStreaks().hearts).toBeNull()
    expect(rememberDailyPlay('hearts', '2026-10-11')).toBe(1)
    expect(loadDailyStreaks().hearts).toEqual({ last: '2026-10-11', count: 1 })
    expect(rememberDailyPlay('hearts', '2026-10-12')).toBe(2)
    localStorage.setItem('cardparlour.dailyStreak.v1', '{')
    expect(loadDailyStreaks().euchre).toBeNull()
  })
})

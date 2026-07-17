import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dailyGoalChips,
  dailyGoalsAllGames,
  dailyGoalsSummary,
  loadGoals,
  recordGoalEvent,
} from './goals'
import { goalsKey } from './storageKeys'

afterEach(() => {
  localStorage.removeItem(goalsKey('hearts'))
  localStorage.removeItem(goalsKey('spades'))
  localStorage.removeItem(goalsKey('euchre'))
})

describe('goals', () => {
  it('records progress on an active daily goal metric', () => {
    // Daily rotation picks 2 of 4 goals — do not assume Warm Up is always active.
    const state = loadGoals('hearts')
    const daily = state.active.find((g) => g.period === 'daily')
    expect(daily).toBeDefined()
    const next = recordGoalEvent({ metric: daily!.metric }, 'hearts')
    const p = next.progress[daily!.id]
    expect(p.current).toBeGreaterThanOrEqual(1)
    expect(p.completed).toBe(daily!.target <= 1)
  })

  it('completes a daily goal when target is met', () => {
    let state = loadGoals('hearts')
    const daily = state.active.find((g) => g.period === 'daily' && g.target === 1)
    if (!daily) return
    state = recordGoalEvent({ metric: daily.metric }, 'hearts')
    const p = state.progress[daily.id]
    expect(p.completed).toBe(true)
    expect(p.claimedAt).not.toBeNull()
  })

  it('dailyGoalChips lists incomplete daily goals with descriptions', () => {
    const chips = dailyGoalChips()
    for (const chip of chips) {
      expect(chip.description.length).toBeGreaterThan(0)
      expect(chip.target).toBeGreaterThan(0)
    }
  })

  it('dailyGoalsSummary counts today dailies across all games', () => {
    const summary = dailyGoalsSummary()
    expect(summary.total).toBe(6)
    expect(summary.completed).toBeGreaterThanOrEqual(0)
    expect(summary.completed).toBeLessThanOrEqual(summary.total)
  })

  it('dailyGoalsAllGames lists every active daily with progress', () => {
    const rows = dailyGoalsAllGames()
    expect(rows).toHaveLength(6)
    for (const row of rows) {
      expect(row.target).toBeGreaterThan(0)
      expect(row.description.length).toBeGreaterThan(0)
      expect(typeof row.completed).toBe('boolean')
    }
  })

  it('rotates goals when the daily period key changes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00'))
    const first = loadGoals('hearts')
    vi.setSystemTime(new Date('2026-07-16T12:00:00'))
    const second = loadGoals('hearts')
    expect(second.periodKeys.daily).not.toBe(first.periodKeys.daily)
    vi.useRealTimers()
  })
})
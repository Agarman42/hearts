import { afterEach, describe, expect, it, vi } from 'vitest'
import { dailyGoalChips, loadGoals, recordGoalEvent } from './goals'
import { goalsKey } from './storageKeys'

afterEach(() => {
  localStorage.removeItem(goalsKey('hearts'))
  localStorage.removeItem(goalsKey('spades'))
  localStorage.removeItem(goalsKey('euchre'))
})

describe('goals', () => {
  it('records hand-played progress on daily warm-up goals', () => {
    const state = loadGoals('hearts')
    const warmUp = state.active.find((g) => g.metric === 'hands_played' && g.period === 'daily')
    expect(warmUp).toBeDefined()
    const next = recordGoalEvent({ metric: 'hands_played' }, 'hearts')
    const p = next.progress[warmUp!.id]
    expect(p.current).toBe(1)
    expect(p.completed).toBe(false)
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
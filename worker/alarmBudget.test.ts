import { describe, expect, it } from 'vitest'
import { noteAlarm } from './alarmBudget'

describe('alarm budget', () => {
  it('trips after 300 alarms', () => {
    let prev = noteAlarm(undefined, 0).budget
    for (let i = 1; i < 300; i++) prev = noteAlarm(prev, i * 1000).budget
    expect(prev.count).toBe(300)
    expect(noteAlarm(prev, 300_000).tripped).toBe(true)
  })

  it('trips when more than 50 alarms land under 200 ms apart', () => {
    let prev = noteAlarm(undefined, 0).budget
    let tripped = false
    for (let i = 1; i <= 60; i++) {
      const next = noteAlarm(prev, i * 100)
      prev = next.budget
      tripped = next.tripped
    }
    expect(tripped).toBe(true)
    expect(prev.burst).toBeGreaterThan(50)
  })

  it('clears the burst when alarms slow down', () => {
    const first = noteAlarm(undefined, 0)
    const second = noteAlarm(first.budget, 100)
    expect(second.budget.burst).toBe(1)
    const later = noteAlarm(second.budget, 100 + 200)
    expect(later.budget.burst).toBe(0)
    expect(later.tripped).toBe(false)
  })
})

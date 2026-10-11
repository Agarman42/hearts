import { describe, expect, it } from 'vitest'
import {
  ALARM_BURST_GAP_MS,
  ALARM_MAX_BURST,
  ALARM_MAX_PER_MINUTE,
  noteAlarm,
} from './alarmBudget'

describe('alarm budget', () => {
  it('trips after more alarms in one minute than a bot table uses, and forgets older ones', () => {
    let prev = noteAlarm(undefined, 0).budget
    let tripped = false
    const gap = ALARM_BURST_GAP_MS
    for (let i = 1; i < ALARM_MAX_PER_MINUTE; i++) {
      const next = noteAlarm(prev, i * gap)
      prev = next.budget
      tripped = next.tripped
    }
    expect(tripped).toBe(false)
    expect(prev.recent).toHaveLength(ALARM_MAX_PER_MINUTE)
    const over = noteAlarm(prev, ALARM_MAX_PER_MINUTE * gap)
    expect(over.tripped).toBe(true)

    const later = noteAlarm(over.budget, ALARM_MAX_PER_MINUTE * gap + 120_000)
    expect(later.tripped).toBe(false)
    expect(later.budget.recent).toHaveLength(1)
  })

  it('does not trip the bot-table rhythm of four quick plays and a trick', () => {
    let prev = noteAlarm(undefined, 0).budget
    let t = 0
    for (let i = 0; i < 400; i++) {
      t += i % 5 === 4 ? 640 : 260
      const next = noteAlarm(prev, t)
      expect(next.tripped).toBe(false)
      prev = next.budget
    }
  })

  it('counts alarms 250 ms apart as a fast repeat', () => {
    let prev = noteAlarm(undefined, 0).budget
    let tripped = false
    for (let i = 1; i <= ALARM_MAX_BURST + 5; i++) {
      const next = noteAlarm(prev, i * 250)
      prev = next.budget
      tripped = next.tripped
    }
    expect(250).toBeLessThan(ALARM_BURST_GAP_MS)
    expect(tripped).toBe(true)
    expect(prev.burst).toBeGreaterThan(ALARM_MAX_BURST)
  })

  it('does not treat a 300 ms gap as a fast repeat', () => {
    const first = noteAlarm(undefined, 0)
    const second = noteAlarm(first.budget, ALARM_BURST_GAP_MS)
    expect(second.budget.burst).toBe(0)
    expect(second.tripped).toBe(false)
  })

  it('clears the burst when alarms slow down', () => {
    const first = noteAlarm(undefined, 0)
    const second = noteAlarm(first.budget, 250)
    expect(second.budget.burst).toBe(1)
    const later = noteAlarm(second.budget, 250 + 1000)
    expect(later.budget.burst).toBe(0)
    expect(later.tripped).toBe(false)
  })

  it('does not trip a room that alarms once a minute for hours', () => {
    let prev = noteAlarm(undefined, 0).budget
    for (let i = 1; i <= 400; i++) {
      const next = noteAlarm(prev, i * 60_000)
      expect(next.tripped).toBe(false)
      prev = next.budget
    }
  })
})

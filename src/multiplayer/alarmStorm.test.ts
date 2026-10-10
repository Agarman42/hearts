import { describe, expect, it } from 'vitest'
import type { GameId } from '../games/registry'
import { RoomSession } from './roomSession'
import type { Outbox } from './roomSession'

const MIN_ALARM_MS = 250

function drive(room: RoomSession, out: Outbox, now: number, until: number) {
  let alarms = 0
  let floored = 0
  while (!room.isClosed() && now < until && alarms < 800) {
    if (!out.delayMs) break
    expect(out.delayMs.ms).toBeGreaterThanOrEqual(MIN_ALARM_MS)
    if (out.delayMs.ms === MIN_ALARM_MS) floored += 1
    now += out.delayMs.ms
    alarms += 1
    out = room.tick(now)
  }
  return { alarms, floored, now, closed: room.isClosed() }
}

function abandon(gameId: GameId, awaySeat: 'bot' | 'ask') {
  const room = RoomSession.create({
    code: 'ALRM',
    gameId,
    hostId: 'p0',
    hostName: 'Ada',
    awaySeat,
  })
  const now = 1_000_000
  room.handle('p0', { type: 'hello', name: 'Ada' }, now)
  room.handle('p0', { type: 'start' }, now)
  const out = room.markDisconnected('p0', now)
  return drive(room, out, now, now + 30 * 60_000)
}

describe('abandoned room alarms', () => {
  it.each(['hearts', 'spades', 'euchre'] as const)(
    'closes an empty %s table in under 20 alarms when a bot sits the empty chair',
    (gameId) => {
      const result = abandon(gameId, 'bot')
      expect(result.closed).toBe(true)
      expect(result.alarms).toBeLessThan(20)
      expect(result.floored).toBe(0)
    },
  )

  it.each(['hearts', 'spades', 'euchre'] as const)(
    'closes an empty %s table in under 20 alarms when the table asks before a bot sits',
    (gameId) => {
      const result = abandon(gameId, 'ask')
      expect(result.closed).toBe(true)
      expect(result.alarms).toBeLessThan(20)
      expect(result.floored).toBe(0)
    },
  )

  it.each(['bot', 'ask'] as const)(
    'does not hot-loop while another human stays (%s)',
    (awaySeat) => {
      const room = RoomSession.create({
        code: 'ALRM',
        gameId: 'hearts',
        hostId: 'p0',
        hostName: 'Ada',
        awaySeat,
      })
      const now = 1_000_000
      room.handle('p0', { type: 'hello', name: 'Ada' }, now)
      room.handle('p1', { type: 'hello', name: 'Ben' }, now)
      room.handle('p0', { type: 'start' }, now)
      const out = room.markDisconnected('p0', now)
      const result = drive(room, out, now, now + 3 * 60_000)
      expect(result.closed).toBe(false)
      expect(result.floored).toBeLessThan(10)
    },
  )
})

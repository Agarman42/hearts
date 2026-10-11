import { afterEach, describe, expect, it, vi } from 'vitest'
import { ROOM_CLOSED_WS_CODE } from '../src/multiplayer/protocol'
import { RoomDurableObject } from './room'

class FakeSocket {
  sent: string[] = []
  closeCode: number | null = null
  closeReason = ''
  send(data: string) {
    this.sent.push(data)
  }
  close(code?: number, reason?: string) {
    this.closeCode = code ?? null
    this.closeReason = reason ?? ''
  }
  serializeAttachment() {}
  deserializeAttachment() {
    return {}
  }
}

function harness(disabled = '0') {
  const stored = new Map<string, unknown>()
  const sockets: FakeSocket[] = []
  const flags = { deletedAll: false, deletedAlarm: false }
  const storage = {
    async get<T>(key: string): Promise<T | undefined> {
      return stored.get(key) as T | undefined
    },
    async put(key: string, value: unknown) {
      stored.set(key, value)
    },
    async delete(key: string) {
      stored.delete(key)
    },
    async deleteAll() {
      flags.deletedAll = true
      stored.clear()
    },
    async deleteAlarm() {
      flags.deletedAlarm = true
    },
    async setAlarm() {},
  }
  const room = new RoomDurableObject(
    {
      storage,
      id: { name: 'K7QM', toString: () => 'K7QM' },
      acceptWebSocket(ws: WebSocket) {
        sockets.push(ws as unknown as FakeSocket)
      },
      getWebSockets: () => sockets as unknown as WebSocket[],
    },
    {
      ROOMS_DISABLED: disabled,
      ROOM: {
        idFromName: () => 'unused',
        get: () => {
          throw new Error('no stub')
        },
      },
    },
  )
  return { room, stored, sockets, flags }
}

describe('room guard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs the room id on an alarm', async () => {
    const lines: string[] = []
    vi.spyOn(console, 'log').mockImplementation((line?: unknown) => {
      lines.push(String(line))
    })
    const { room, flags } = harness()
    await room.alarm()
    expect(flags.deletedAlarm).toBe(true)
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ source: 'room', event: 'alarm', roomId: 'K7QM' })
  })

  it('closes sockets, clears storage, and deletes the alarm when alarms come too fast', async () => {
    const { room, stored, sockets, flags } = harness()
    let now = 1_700_000_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const created = await room.fetch(
      new Request('https://room/create', {
        method: 'POST',
        body: JSON.stringify({ code: 'K7QM', gameId: 'hearts', name: 'Ada' }),
      }),
    )
    expect(created.status).toBe(200)
    sockets.push(new FakeSocket())

    for (let i = 0; i < 70 && !flags.deletedAll; i++) {
      now += 250
      await room.alarm()
    }

    expect(flags.deletedAll).toBe(true)
    expect(flags.deletedAlarm).toBe(true)
    expect(stored.has('session')).toBe(false)
    expect(sockets[0]?.closeCode).toBe(ROOM_CLOSED_WS_CODE)
    expect(sockets[0]?.closeReason).toBe('room closed')
    expect(sockets[0]?.sent[0]).toContain('room_closed')
  })

  it('refuses a paused room without keeping its alarm', async () => {
    const { room, flags, sockets } = harness('1')
    sockets.push(new FakeSocket())
    const res = await room.fetch(new Request('https://room/create', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(503)
    await room.alarm()
    expect(flags.deletedAll).toBe(true)
    expect(flags.deletedAlarm).toBe(true)
    expect(sockets[0]?.closeCode).toBe(ROOM_CLOSED_WS_CODE)
  })
})

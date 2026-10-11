import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectRoom, readStoredToken, reconnectDelayMs, tokenStorageKey } from './client'
import { ROOM_CLOSED_WS_CODE } from './protocol'

class FakeWS {
  static OPEN = 1
  readyState = 1
  sent: string[] = []
  onmessage: ((ev: { data: string }) => void) | null = null
  send(data: string) { this.sent.push(data) }
  close() {}
}

class ScriptedWS {
  static OPEN = 1
  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: ((ev?: { code?: number }) => void) | null = null
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
}

describe('connectRoom', () => {
  afterEach(() => {
    localStorage.removeItem(tokenStorageKey('K7QM'))
    sessionStorage.removeItem(tokenStorageKey('K7QM'))
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends hello on open and forwards snapshots', () => {
    const ws = new FakeWS()
    const factory = () => ws as unknown as WebSocket
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: factory,
    })
    const seen: unknown[] = []
    client.subscribe((m) => seen.push(m))
    ws.onmessage?.({ data: JSON.stringify({ type: 'joined', token: 'abc', playerId: 'p0', seat: 0 }) })
    expect(seen[0]).toEqual({ type: 'joined', token: 'abc', playerId: 'p0', seat: 0 })
    client.send({ type: 'vote_fill_ai', approve: true })
    expect(JSON.parse(ws.sent[0]).type).toBe('vote_fill_ai')
  })

  it('sends hello when the socket opens and stores the joined token', () => {
    const ws = new ScriptedWS()
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => ws as unknown as WebSocket,
    })
    ws.open()
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'hello', name: 'Ada' })
    ws.onmessage?.({
      data: JSON.stringify({ type: 'joined', token: 'abc', playerId: 'p0', seat: 0 }),
    })
    expect(readStoredToken('K7QM')).toBe('abc')
    expect(localStorage.getItem(tokenStorageKey('K7QM'))).toBe('abc')
    expect(sessionStorage.getItem(tokenStorageKey('K7QM'))).toBe('abc')
    client.close()
  })

  it('reconnects with the stored token after close', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.useFakeTimers()
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    sockets[0]!.open()
    sockets[0]!.onmessage?.({
      data: JSON.stringify({ type: 'joined', token: 'tok', playerId: 'p0', seat: 0 }),
    })
    sockets[0]!.readyState = 3
    sockets[0]!.onclose?.()
    vi.advanceTimersByTime(999)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(2)
    sockets[1]!.open()
    expect(JSON.parse(sockets[1]!.sent[0]!)).toEqual({
      type: 'hello',
      token: 'tok',
      name: 'Ada',
    })
    client.close()
  })

  it('reconnects immediately on visibilitychange when the socket is down', () => {
    vi.useFakeTimers()
    const listeners = new Map<string, EventListener>()
    const doc = {
      visibilityState: 'visible',
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    }
    vi.stubGlobal('document', doc)
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    sockets[0]!.open()
    sockets[0]!.readyState = 3
    listeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(sockets).toHaveLength(2)
    sockets[1]!.open()
    expect(JSON.parse(sockets[1]!.sent[0]!).type).toBe('hello')
    client.close()
    vi.unstubAllGlobals()
  })

  it('gives up quickly when a join never opens', () => {
    vi.useFakeTimers()
    const fatals: string[] = []
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/ZZZZ',
      code: 'ZZZZ',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    client.subscribeFatal((m) => fatals.push(m))
    sockets[0]!.onclose?.()
    vi.advanceTimersByTime(1000)
    sockets[1]!.onclose?.()
    vi.advanceTimersByTime(2000)
    sockets[2]!.onclose?.()
    expect(fatals[0]).toMatch(/code/i)
    expect(sockets.length).toBe(3)
    client.close()
  })

  it('does not open a second socket while the first is still connecting', () => {
    const listeners = new Map<string, EventListener>()
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    })
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    expect(sockets[0]!.readyState).toBe(0)
    listeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(sockets).toHaveLength(1)
    client.close()
  })

  it('waits at least a second and grows the wait', () => {
    expect(reconnectDelayMs(1, () => 0)).toBe(1000)
    expect(reconnectDelayMs(2, () => 0)).toBe(2000)
    expect(reconnectDelayMs(3, () => 0)).toBe(4000)
    expect(reconnectDelayMs(1, () => 0.99)).toBeGreaterThanOrEqual(1000)
    expect(reconnectDelayMs(1, () => 0.99)).toBeLessThan(1300)
  })

  it('does not open another socket while a retry is already waiting', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.useFakeTimers()
    const listeners = new Map<string, EventListener>()
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    })
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    sockets[0]!.open()
    sockets[0]!.onmessage?.({
      data: JSON.stringify({ type: 'joined', token: 'tok', playerId: 'p0', seat: 0 }),
    })
    sockets[0]!.readyState = 3
    sockets[0]!.onclose?.()
    vi.advanceTimersByTime(200)
    listeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(800)
    expect(sockets).toHaveLength(2)
    client.close()
  })

  it('stops for good when the room closes, even if the tab becomes visible', () => {
    const listeners = new Map<string, EventListener>()
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    })
    const fatals: string[] = []
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    client.subscribeFatal((m) => fatals.push(m))
    sockets[0]!.open()
    sockets[0]!.onmessage?.({
      data: JSON.stringify({ type: 'error', code: 'room_closed', message: 'This table is closed.' }),
    })
    expect(fatals[0]).toMatch(/closed/i)
    sockets[0]!.readyState = 3
    sockets[0]!.onclose?.({ code: ROOM_CLOSED_WS_CODE })
    listeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(sockets).toHaveLength(1)
    client.close()
  })

  it('stops on the room-closed socket code alone', () => {
    const listeners = new Map<string, EventListener>()
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    })
    const fatals: string[] = []
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    client.subscribeFatal((m) => fatals.push(m))
    sockets[0]!.open()
    sockets[0]!.readyState = 3
    sockets[0]!.onclose?.({ code: ROOM_CLOSED_WS_CODE })
    listeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(fatals[0]).toMatch(/closed/i)
    expect(sockets).toHaveLength(1)
    client.close()
  })

  it('tells the table the room is missing and does not retry when the tab returns', () => {
    const listeners = new Map<string, EventListener>()
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener(type: string, fn: EventListener) {
        listeners.set(type, fn)
      },
      removeEventListener(type: string) {
        listeners.delete(type)
      },
    })
    const seen: unknown[] = []
    const fatals: string[] = []
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    client.subscribe((m) => seen.push(m))
    client.subscribeFatal((m) => fatals.push(m))
    sockets[0]!.open()
    sockets[0]!.onmessage?.({
      data: JSON.stringify({ type: 'error', code: 'room_not_found', message: 'No table with that code.' }),
    })
    expect(seen[0]).toMatchObject({ type: 'error', code: 'room_not_found' })
    expect(fatals[0]).toMatch(/code/i)
    sockets[0]!.readyState = 3
    sockets[0]!.onclose?.()
    listeners.get('visibilitychange')?.(new Event('visibilitychange'))
    expect(sockets).toHaveLength(1)
    client.close()
  })

  it('does not reset the retry count when the socket opens before a join', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.useFakeTimers()
    const sockets: ScriptedWS[] = []
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: () => {
        const next = new ScriptedWS()
        sockets.push(next)
        return next as unknown as WebSocket
      },
    })
    sockets[0]!.open()
    sockets[0]!.readyState = 3
    sockets[0]!.onclose?.()
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    sockets[1]!.open()
    sockets[1]!.readyState = 3
    sockets[1]!.onclose?.()
    vi.advanceTimersByTime(1999)
    expect(sockets).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(3)
    client.close()
  })
})

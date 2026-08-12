import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectRoom, readStoredToken, tokenStorageKey } from './client'

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
  onclose: (() => void) | null = null
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
    vi.advanceTimersByTime(1000)
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
})

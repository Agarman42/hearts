import { cleanDisplayName } from '../displayName'
import { ROOM_CLOSED_WS_CODE, type ClientMessage, type ServerMessage } from './protocol'

export type TransportFactory = (url: string) => WebSocket

export type ConnectRoomOpts = {
  url: string
  code: string
  name: string
  token?: string
  transport?: TransportFactory
}

export type RoomClient = {
  send(msg: ClientMessage): void
  subscribe(fn: (msg: ServerMessage) => void): () => void
  subscribeConnection(fn: (connected: boolean) => void): () => void
  subscribeFatal(fn: (message: string) => void): () => void
  close(): void
}

const WS_CONNECTING = 0
const WS_OPEN = 1
const WS_CLOSING = 2
const WS_CLOSED = 3
const MAX_RECONNECT_ATTEMPTS = 8
const FIRST_JOIN_ATTEMPTS = 3

/** Exponential backoff with jitter. The first retry waits at least one second. */
export function reconnectDelayMs(attempt: number, rand: () => number = Math.random): number {
  const step = Math.max(1, attempt)
  const base = Math.min(30_000, 1000 * 2 ** (step - 1))
  const jitter = Math.floor(rand() * base * 0.25)
  return base + jitter
}

export function tokenStorageKey(code: string): string {
  return `cardtable.mp.token.${code.toUpperCase()}`
}

function storageGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function storageSet(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value)
  } catch {
    /* private mode / missing storage */
  }
}

export function readStoredToken(code: string): string | undefined {
  const key = tokenStorageKey(code)
  const session =
    typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  const local = typeof localStorage === 'undefined' ? undefined : localStorage
  return storageGet(session, key) ?? storageGet(local, key) ?? undefined
}

export function persistToken(code: string, token: string): void {
  const key = tokenStorageKey(code)
  const session =
    typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  const local = typeof localStorage === 'undefined' ? undefined : localStorage
  storageSet(local, key, token)
  storageSet(session, key, token)
}

function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw) as ServerMessage
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return null
    return msg
  } catch {
    return null
  }
}

export function connectRoom(opts: ConnectRoomOpts): RoomClient {
  const transport = opts.transport ?? ((url: string) => new WebSocket(url))
  const listeners = new Set<(msg: ServerMessage) => void>()
  const connectionListeners = new Set<(connected: boolean) => void>()
  const fatalListeners = new Set<(message: string) => void>()
  let closed = false
  let ws: WebSocket | null = null
  let attempts = 0
  let everJoined = false
  let gaveUp = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let token = opts.token ?? readStoredToken(opts.code)

  function emit(msg: ServerMessage): void {
    for (const fn of listeners) fn(msg)
  }

  function emitConnection(connected: boolean): void {
    for (const fn of connectionListeners) fn(connected)
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function emitFatal(message: string): void {
    for (const fn of fatalListeners) fn(message)
  }

  function giveUp(message: string): void {
    if (gaveUp) return
    gaveUp = true
    clearReconnectTimer()
    emitFatal(message)
    emitConnection(false)
  }

  function scheduleReconnect(): void {
    if (closed || gaveUp) return
    attempts += 1
    if (!everJoined && attempts >= FIRST_JOIN_ATTEMPTS) {
      giveUp('No table with that code. Check the code or start a new one.')
      return
    }
    if (everJoined && attempts >= MAX_RECONNECT_ATTEMPTS) {
      giveUp('Lost the table. Check your connection or join again from Home.')
      return
    }
    token = token ?? readStoredToken(opts.code)
    clearReconnectTimer()
    const delay = reconnectDelayMs(attempts)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (closed || gaveUp) return
      attach(transport(opts.url))
    }, delay)
  }

  function handleRaw(data: unknown): void {
    if (typeof data !== 'string') return
    const msg = parseServerMessage(data)
    if (!msg) return
    if (msg.type === 'joined') {
      persistToken(opts.code, msg.token)
      token = msg.token
      everJoined = true
      attempts = 0
    }
    if (
      msg.type === 'error' &&
      (msg.code === 'room_closed' || msg.code === 'room_not_found')
    ) {
      emit(msg)
      giveUp(msg.message || 'This table is closed.')
      return
    }
    emit(msg)
  }

  function sendHello(socket: WebSocket): void {
    const name = cleanDisplayName(opts.name)
    const hello: ClientMessage = token
      ? { type: 'hello', token, name }
      : { type: 'hello', name }
    socket.send(JSON.stringify(hello))
  }

  function discardSocket(socket: WebSocket): void {
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    if (socket.readyState !== WS_CLOSED && socket.readyState !== WS_CLOSING) {
      socket.close()
    }
  }

  function attach(socket: WebSocket): void {
    if (ws && ws !== socket) discardSocket(ws)
    ws = socket
    socket.onopen = () => {
      emitConnection(true)
      sendHello(socket)
    }
    socket.onmessage = (ev: { data: unknown }) => {
      handleRaw(ev.data)
    }
    socket.onclose = (ev?: { code?: number }) => {
      emitConnection(false)
      if (closed || gaveUp) return
      if (ws !== socket) return
      if (ev?.code === ROOM_CLOSED_WS_CODE) {
        giveUp('This table is closed.')
        return
      }
      scheduleReconnect()
    }
  }

  function onVisibility(): void {
    if (closed || gaveUp) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (ws && (ws.readyState === WS_OPEN || ws.readyState === WS_CONNECTING)) return
    if (reconnectTimer != null) return
    attach(transport(opts.url))
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility)
  }

  attach(transport(opts.url))

  return {
    send(msg) {
      if (ws && ws.readyState === WS_OPEN) {
        ws.send(JSON.stringify(msg))
      }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    subscribeConnection(fn) {
      connectionListeners.add(fn)
      return () => {
        connectionListeners.delete(fn)
      }
    },
    subscribeFatal(fn) {
      fatalListeners.add(fn)
      return () => {
        fatalListeners.delete(fn)
      }
    },
    close() {
      closed = true
      clearReconnectTimer()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
      ws?.close()
    },
  }
}

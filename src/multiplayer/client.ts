import type { ClientMessage, ServerMessage } from './protocol'

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
  close(): void
}

const WS_OPEN = 1
const MAX_RECONNECT_ATTEMPTS = 20
const RECONNECT_MS = 1000

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
  let closed = false
  let ws: WebSocket | null = null
  let attempts = 0
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

  function scheduleReconnect(): void {
    if (closed) return
    if (attempts >= MAX_RECONNECT_ATTEMPTS) return
    attempts += 1
    token = token ?? readStoredToken(opts.code)
    clearReconnectTimer()
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (closed) return
      attach(transport(opts.url))
    }, RECONNECT_MS)
  }

  function handleRaw(data: unknown): void {
    if (typeof data !== 'string') return
    const msg = parseServerMessage(data)
    if (!msg) return
    if (msg.type === 'joined') {
      persistToken(opts.code, msg.token)
      token = msg.token
    }
    emit(msg)
  }

  function sendHello(socket: WebSocket): void {
    const hello: ClientMessage = token
      ? { type: 'hello', token, name: opts.name }
      : { type: 'hello', name: opts.name }
    socket.send(JSON.stringify(hello))
  }

  function attach(socket: WebSocket): void {
    ws = socket
    socket.onopen = () => {
      attempts = 0
      emitConnection(true)
      sendHello(socket)
    }
    socket.onmessage = (ev: { data: unknown }) => {
      handleRaw(ev.data)
    }
    socket.onclose = () => {
      emitConnection(false)
      if (closed) return
      scheduleReconnect()
    }
  }

  function onVisibility(): void {
    if (closed) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (ws && ws.readyState === WS_OPEN) return
    clearReconnectTimer()
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

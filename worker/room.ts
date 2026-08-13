import {
  RoomSession,
  type Outbox,
  type RoomSessionJSON,
} from '../src/multiplayer/roomSession'
import type { ClientMessage, GameId } from '../src/multiplayer/protocol'
import { newPlayerToken } from '../src/multiplayer/token'
import { sanitizeRoomRules } from '../src/multiplayer/roomRules'

const GAMES: readonly GameId[] = ['hearts', 'spades', 'euchre']

type SessionAttachment = { playerId?: string }

type CfWebSocket = WebSocket & {
  serializeAttachment(value: SessionAttachment): void
  deserializeAttachment(): SessionAttachment | null
}

type DoStorage = {
  get<T>(key: string): Promise<T | undefined>
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
  setAlarm?(timestamp: number): Promise<void>
}

type DoState = {
  storage: DoStorage
  acceptWebSocket(ws: WebSocket): void
  getWebSockets(): WebSocket[]
}

export type RoomEnv = {
  ROOM: {
    idFromName(name: string): unknown
    get(id: unknown): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }
  }
}

export type CreateRoomBody = {
  code: string
  gameId: GameId
  name: string
  rules?: unknown
}

function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAMES as readonly string[]).includes(value)
}

export class RoomDurableObject {
  private ctx: DoState
  private session: RoomSession | null = null

  constructor(ctx: DoState, _env: RoomEnv) {
    this.ctx = ctx
  }

  async fetch(request: Request): Promise<Response> {
    await this.hydrate()
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/create') {
      return this.createRoom(request)
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }
    if (!this.session || this.session.isClosed()) {
      return new Response(this.session?.isClosed() ? 'Room closed' : 'Room not found', {
        status: this.session?.isClosed() ? 410 : 404,
      })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1] as CfWebSocket
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({})
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    await this.hydrate()
    if (!this.session) {
      ws.send(JSON.stringify({ type: 'error', code: 'unknown_token', message: 'Room not found.' }))
      return
    }
    let msg: ClientMessage
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)) as ClientMessage
    } catch {
      ws.send(JSON.stringify({ type: 'error', code: 'unknown_action', message: 'Invalid JSON.' }))
      return
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      ws.send(JSON.stringify({ type: 'error', code: 'unknown_action', message: 'Invalid message.' }))
      return
    }

    const socket = ws as CfWebSocket
    const att = socket.deserializeAttachment() ?? {}
    const playerId = this.resolvePlayerId(msg, att.playerId)
    socket.serializeAttachment({ playerId })

    const out = this.session.handle(playerId, msg, Date.now())
    const joined = out.to.find((m) => m.msg.type === 'joined' && m.playerId === playerId)
    if (joined?.msg.type === 'joined') {
      socket.serializeAttachment({ playerId: joined.msg.playerId })
    }
    this.dispatch(out)
    await this.persist()
    await this.schedule(out)
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    await this.hydrate()
    if (!this.session) return
    const att = (ws as CfWebSocket).deserializeAttachment()
    if (!att?.playerId) return
    const out = this.session.markDisconnected(att.playerId, Date.now())
    this.dispatch(out)
    await this.persist()
    await this.schedule(out)
    if (this.session.isClosed()) await this.destroyRoom()
  }

  async alarm(): Promise<void> {
    await this.hydrate()
    if (!this.session) return
    const out = this.session.tick(Date.now())
    if (this.session.isClosed()) {
      await this.destroyRoom()
      return
    }
    this.dispatch(out)
    await this.persist()
    await this.schedule(out)
  }

  private async createRoom(request: Request): Promise<Response> {
    let body: Partial<CreateRoomBody>
    try {
      body = (await request.json()) as Partial<CreateRoomBody>
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }
    if (!body.code || !isGameId(body.gameId) || !body.name) {
      return new Response('Expected { code, gameId, name }', { status: 400 })
    }
    if (this.session) {
      return new Response('Room exists', { status: 409 })
    }
    const hostId = `host-${body.code}`
    const token = newPlayerToken()
    this.session = RoomSession.create({
      code: body.code,
      gameId: body.gameId,
      hostId,
      hostName: body.name,
      hostToken: token,
      rules: sanitizeRoomRules(body.gameId, body.rules),
    })
    await this.persist()
    return Response.json({ ok: true, code: body.code, token, playerId: hostId })
  }

  private resolvePlayerId(msg: ClientMessage, attached?: string): string {
    if (!this.session) return attached ?? crypto.randomUUID()
    if (msg.type === 'hello' && msg.token) {
      const owner = this.session.playerIdForToken(msg.token)
      if (owner) return owner
    }
    if (attached) return attached
    return crypto.randomUUID()
  }

  private dispatch(out: Outbox): void {
    const byPlayer = new Map<string, Outbox['to']>()
    for (const entry of out.to) {
      const list = byPlayer.get(entry.playerId) ?? []
      list.push(entry)
      byPlayer.set(entry.playerId, list)
    }
    for (const ws of this.ctx.getWebSockets()) {
      const att = (ws as CfWebSocket).deserializeAttachment()
      if (!att?.playerId) continue
      const entries = byPlayer.get(att.playerId)
      if (!entries) continue
      for (const entry of entries) {
        ws.send(JSON.stringify(entry.msg))
      }
    }
  }

  private async hydrate(): Promise<void> {
    if (this.session) return
    const saved = await this.ctx.storage.get<RoomSessionJSON>('session')
    if (saved) this.session = RoomSession.fromJSON(saved)
  }

  private async persist(): Promise<void> {
    if (!this.session) return
    await this.ctx.storage.put('session', this.session.toJSON())
  }

  private async destroyRoom(): Promise<void> {
    this.session = null
    await this.ctx.storage.delete('session')
  }

  private async schedule(out: Outbox): Promise<void> {
    if (!out.delayMs || !this.ctx.storage.setAlarm) return
    await this.ctx.storage.setAlarm(Date.now() + out.delayMs.ms)
  }
}

declare class WebSocketPair {
  0: WebSocket
  1: WebSocket
}

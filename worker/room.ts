import {
  RoomSession,
  type Outbox,
  type RoomSessionJSON,
} from '../src/multiplayer/roomSession'
import type { ClientMessage, GameId } from '../src/multiplayer/protocol'
import { newPlayerToken } from '../src/multiplayer/token'
import { sanitizeRoomRules } from '../src/multiplayer/roomRules'
import { noteAlarm, type AlarmBudget } from './alarmBudget'
import { roomsDisabled } from './killSwitch'
import { ROOM_CLOSED_WS_CODE } from '../src/multiplayer/protocol'

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
  deleteAll?(): Promise<void>
  setAlarm?(timestamp: number): Promise<void>
  deleteAlarm?(): Promise<void>
}

type DoState = {
  storage: DoStorage
  id?: { toString(): string; name?: string }
  acceptWebSocket(ws: WebSocket): void
  getWebSockets(): WebSocket[]
}

export type RoomEnv = {
  ROOMS_DISABLED?: string
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

const ROOM_CLOSED_MSG = {
  type: 'error' as const,
  code: 'room_closed' as const,
  message: 'This table is closed.',
}

export class RoomDurableObject {
  private ctx: DoState
  private session: RoomSession | null = null
  private disabled: boolean

  constructor(ctx: DoState, env: RoomEnv) {
    this.ctx = ctx
    this.disabled = roomsDisabled(env)
  }

  async fetch(request: Request): Promise<Response> {
    this.log('fetch')
    if (this.disabled) return this.refuseDisabled()
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
    this.log('ws')
    if (this.disabled) {
      await this.shutdownRoom('kill_switch')
      return
    }
    await this.hydrate()
    if (!this.session) {
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'room_not_found',
          message: 'No table with that code.',
        }),
      )
      try {
        ws.close(ROOM_CLOSED_WS_CODE, 'room closed')
      } catch {
        /* already gone */
      }
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
    this.log('close', { reason: 'socket' })
    if (this.disabled) {
      await this.shutdownRoom('kill_switch')
      return
    }
    await this.hydrate()
    if (!this.session) return
    const att = (ws as CfWebSocket).deserializeAttachment()
    if (!att?.playerId) return
    const out = this.session.markDisconnected(att.playerId, Date.now())
    this.dispatch(out)
    await this.persist()
    await this.schedule(out)
    if (this.session.isClosed()) await this.shutdownRoom('session_closed')
  }

  async alarm(): Promise<void> {
    this.log('alarm')
    if (this.disabled) {
      await this.shutdownRoom('kill_switch')
      return
    }
    await this.hydrate()
    if (!this.session) {
      await this.ctx.storage.deleteAlarm?.()
      return
    }
    const now = Date.now()
    const prev = await this.ctx.storage.get<AlarmBudget>('alarms')
    const { budget, tripped } = noteAlarm(prev, now)
    if (tripped) {
      await this.shutdownRoom('alarm_budget', {
        alarmsInWindow: budget.recent.length,
        burst: budget.burst,
      })
      return
    }
    await this.ctx.storage.put('alarms', budget)
    const out = this.session.tick(now)
    if (this.session.isClosed()) {
      await this.shutdownRoom('session_closed')
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

  private roomLabel(): string {
    const id = this.ctx.id
    if (!id) return 'unknown'
    return id.name || id.toString()
  }

  private log(event: 'fetch' | 'ws' | 'alarm' | 'close', extra?: Record<string, unknown>): void {
    console.log(JSON.stringify({ source: 'room', event, roomId: this.roomLabel(), ...extra }))
  }

  private refuseDisabled(): Response {
    this.log('close', { reason: 'kill_switch' })
    return new Response('Rooms are paused.', { status: 503 })
  }

  private async shutdownRoom(reason: string, extra?: Record<string, unknown>): Promise<void> {
    this.log('close', { reason, ...extra })
    const body = JSON.stringify(ROOM_CLOSED_MSG)
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(body)
      } catch {
        /* socket already closing */
      }
      try {
        ws.close(ROOM_CLOSED_WS_CODE, 'room closed')
      } catch {
        /* socket already closing */
      }
    }
    this.session = null
    if (this.ctx.storage.deleteAll) {
      await this.ctx.storage.deleteAll()
    } else {
      await this.ctx.storage.delete('session')
      await this.ctx.storage.delete('alarms')
    }
    await this.ctx.storage.deleteAlarm?.()
  }

  private async schedule(out: Outbox): Promise<void> {
    if (!out.delayMs || !this.ctx.storage.setAlarm) return
    const ms = Math.max(250, out.delayMs.ms)
    await this.ctx.storage.setAlarm(Date.now() + ms)
  }
}

declare class WebSocketPair {
  0: WebSocket
  1: WebSocket
}

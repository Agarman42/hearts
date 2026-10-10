import { newRoomCode } from '../src/multiplayer/codes'
import { corsHeaders } from '../src/multiplayer/origins'
import type { GameId } from '../src/multiplayer/protocol'
import { RoomDurableObject, type RoomEnv } from './room'
import { allowRoomCreate } from './roomCreateLimit'

const createsByIp = new Map<string, number[]>()

export { RoomDurableObject }

const GAMES: readonly GameId[] = ['hearts', 'spades', 'euchre']

function json(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  })
}

function text(request: Request, body: string, status: number): Response {
  return new Response(body, { status, headers: corsHeaders(request) })
}

function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAMES as readonly string[]).includes(value)
}

export default {
  async fetch(request: Request, env: RoomEnv): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/health') {
      return text(request, 'ok', 200)
    }

    if (request.method === 'POST' && url.pathname === '/rooms') {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      const decision = allowRoomCreate(createsByIp.get(ip) ?? [], Date.now())
      createsByIp.set(ip, decision.hits)
      if (!decision.ok) {
        return text(request, 'Too many rooms from this network. Try again in a little while.', 429)
      }
      let body: { gameId?: unknown; name?: unknown; rules?: unknown }
      try {
        body = (await request.json()) as { gameId?: unknown; name?: unknown }
      } catch {
        return text(request, 'Invalid JSON', 400)
      }
      if (!isGameId(body.gameId) || typeof body.name !== 'string' || body.name.trim() === '') {
        return text(request, 'Expected { gameId, name }', 400)
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = newRoomCode()
        const id = env.ROOM.idFromName(code)
        const stub = env.ROOM.get(id)
        const created = await stub.fetch(
          new Request('https://room/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              gameId: body.gameId,
              name: body.name.trim(),
              rules: body.rules,
            }),
          }),
        )
        if (created.status === 409) continue
        if (!created.ok) {
          return text(request, 'Could not create room', 500)
        }
        const data = (await created.json()) as { code?: string; token?: string; playerId?: string }
        if (!data.code || !data.token) {
          return text(request, 'Could not create room', 500)
        }
        return json(request, { code: data.code, token: data.token, playerId: data.playerId })
      }
      return text(request, 'Could not create room', 409)
    }

    const roomMatch = url.pathname.match(/^\/room\/([A-Za-z0-9]{4})$/)
    if (roomMatch && request.method === 'GET') {
      const code = roomMatch[1]!.toUpperCase()
      const id = env.ROOM.idFromName(code)
      const stub = env.ROOM.get(id)
      return stub.fetch(request)
    }

    return text(request, 'Not found', 404)
  },
}

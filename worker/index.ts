import { newRoomCode } from '../src/multiplayer/codes'
import type { GameId } from '../src/multiplayer/protocol'
import { RoomDurableObject, type RoomEnv } from './room'

export { RoomDurableObject }

const GAMES: readonly GameId[] = ['hearts', 'spades', 'euchre']

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function text(body: string, status: number): Response {
  return new Response(body, { status, headers: CORS })
}

function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAMES as readonly string[]).includes(value)
}

export default {
  async fetch(request: Request, env: RoomEnv): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/rooms') {
      let body: { gameId?: unknown; name?: unknown }
      try {
        body = (await request.json()) as { gameId?: unknown; name?: unknown }
      } catch {
        return text('Invalid JSON', 400)
      }
      if (!isGameId(body.gameId) || typeof body.name !== 'string' || body.name.trim() === '') {
        return text('Expected { gameId, name }', 400)
      }
      const code = newRoomCode()
      const id = env.ROOM.idFromName(code)
      const stub = env.ROOM.get(id)
      const created = await stub.fetch(
        new Request('https://room/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, gameId: body.gameId, name: body.name.trim() }),
        }),
      )
      if (!created.ok) {
        return text('Could not create room', created.status === 409 ? 409 : 500)
      }
      return json({ code })
    }

    const roomMatch = url.pathname.match(/^\/room\/([A-Za-z0-9]{4})$/)
    if (roomMatch && request.method === 'GET') {
      const code = roomMatch[1]!.toUpperCase()
      const id = env.ROOM.idFromName(code)
      const stub = env.ROOM.get(id)
      return stub.fetch(request)
    }

    return text('Not found', 404)
  },
}

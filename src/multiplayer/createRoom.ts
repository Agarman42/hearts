import type { GameId } from '../games/registry'
import { persistToken } from './client'

export type CreateRoomResult = {
  code: string
  token: string
}

export type CreateRoomCache = {
  inflight: Promise<CreateRoomResult> | null
  result: CreateRoomResult | null
}

export function emptyCreateRoomCache(): CreateRoomCache {
  return { inflight: null, result: null }
}

/**
 * Dedupes create-room calls that share a cache (Strict Mode remount / double effect).
 * Reuses an in-flight promise or an already-created result; a failed create clears
 * the cache so the next call may retry.
 */
export function createRoomOnce(
  cache: CreateRoomCache,
  create: () => Promise<CreateRoomResult>,
): Promise<CreateRoomResult> {
  if (cache.result) return Promise.resolve(cache.result)
  if (cache.inflight) return cache.inflight
  const pending = create()
    .then((result) => {
      cache.result = result
      return result
    })
    .finally(() => {
      if (cache.inflight === pending) cache.inflight = null
    })
  cache.inflight = pending
  return pending
}

export async function postCreateRoom(
  wsUrl: string,
  gameId: GameId,
  name: string,
): Promise<CreateRoomResult> {
  const httpOrigin = wsUrl.replace(/^ws/i, 'http')
  const res = await fetch(`${httpOrigin}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, name }),
  })
  if (!res.ok) {
    throw new Error(res.status === 400 ? 'Could not create room.' : 'Table server is unavailable.')
  }
  const data = (await res.json()) as { code?: string; token?: string }
  if (!data.code || !data.token) throw new Error('Could not create room.')
  const code = data.code.toUpperCase()
  persistToken(code, data.token)
  return { code, token: data.token }
}

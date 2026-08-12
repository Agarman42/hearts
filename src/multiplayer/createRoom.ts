import type { GameId } from '../games/registry'

export type CreateRoomCache = {
  inflight: Promise<string> | null
  code: string | null
}

export function emptyCreateRoomCache(): CreateRoomCache {
  return { inflight: null, code: null }
}

/**
 * Dedupes create-room calls that share a cache (Strict Mode remount / double effect).
 * Reuses an in-flight promise or an already-created code; a failed create clears the
 * cache so the next call may retry.
 */
export function createRoomOnce(
  cache: CreateRoomCache,
  create: () => Promise<string>,
): Promise<string> {
  if (cache.code) return Promise.resolve(cache.code)
  if (cache.inflight) return cache.inflight
  const pending = create()
    .then((code) => {
      cache.code = code
      return code
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
): Promise<string> {
  const httpOrigin = wsUrl.replace(/^ws/i, 'http')
  const res = await fetch(`${httpOrigin}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, name }),
  })
  if (!res.ok) {
    throw new Error(res.status === 400 ? 'Could not create room.' : 'Table server is unavailable.')
  }
  const data = (await res.json()) as { code?: string }
  if (!data.code) throw new Error('Could not create room.')
  return data.code.toUpperCase()
}

const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 20

export function allowRoomCreate(
  hits: number[],
  now: number,
): { ok: boolean; hits: number[] } {
  const fresh = hits.filter((at) => now - at < WINDOW_MS)
  if (fresh.length >= LIMIT) return { ok: false, hits: fresh }
  fresh.push(now)
  return { ok: true, hits: fresh }
}

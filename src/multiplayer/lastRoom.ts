import type { GameId } from '../games/registry'
import { APP_SLUG } from '../appBrand'
import { ROOM_CODE_ALPHABET } from './codes'

const LAST_ROOM_KEY = `${APP_SLUG}.mp.last-room.v1`

export type LastFriendsRoom = {
  code: string
  gameId: GameId
  savedAt: number
}

export function normalizeRoomCode(raw: string): string {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  let out = ''
  for (const ch of upper) {
    if (ROOM_CODE_ALPHABET.includes(ch)) out += ch
    if (out.length === 4) break
  }
  return out
}

function isGameId(value: unknown): value is GameId {
  return value === 'hearts' || value === 'spades' || value === 'euchre'
}

export function loadLastFriendsRoom(): LastFriendsRoom | null {
  try {
    const raw = localStorage.getItem(LAST_ROOM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastFriendsRoom>
    const code = typeof parsed.code === 'string' ? normalizeRoomCode(parsed.code) : ''
    if (code.length !== 4 || !isGameId(parsed.gameId)) return null
    return {
      code,
      gameId: parsed.gameId,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function saveLastFriendsRoom(room: Pick<LastFriendsRoom, 'code' | 'gameId'>): void {
  const code = normalizeRoomCode(room.code)
  if (code.length !== 4) return
  try {
    localStorage.setItem(
      LAST_ROOM_KEY,
      JSON.stringify({ code, gameId: room.gameId, savedAt: Date.now() }),
    )
  } catch {
    /* private mode */
  }
}

export function clearLastFriendsRoom(): void {
  try {
    localStorage.removeItem(LAST_ROOM_KEY)
  } catch {
    /* ignore */
  }
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && Boolean((navigator as { standalone?: boolean }).standalone)
  return mq || ios
}

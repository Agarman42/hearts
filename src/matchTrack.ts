/** Per-match session counters — persisted with saves so resume keeps achievement context. */

import type { GameId } from './games/registry'

export interface HeartsMatchTrack {
  zeroHands: number
  queenFreeHands: number
  moonsByHuman: number
  hadOpponentMoon: boolean
  hands: number
  maxDeficit: number
}

export interface SpadesMatchTrack {
  hands: number
  hadBagPenalty: boolean
  prevTeamScore: number
}

export interface EuchreMatchTrack {
  hands: number
}

export type SavedMatchTrack = HeartsMatchTrack | SpadesMatchTrack | EuchreMatchTrack

export function defaultHeartsMatchTrack(): HeartsMatchTrack {
  return {
    zeroHands: 0,
    queenFreeHands: 0,
    moonsByHuman: 0,
    hadOpponentMoon: false,
    hands: 0,
    maxDeficit: 0,
  }
}

export function defaultSpadesMatchTrack(): SpadesMatchTrack {
  return { hands: 0, hadBagPenalty: false, prevTeamScore: 0 }
}

export function defaultEuchreMatchTrack(): EuchreMatchTrack {
  return { hands: 0 }
}

export function normalizeMatchTrack(
  gameId: GameId,
  raw: unknown,
): SavedMatchTrack | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const t = raw as Record<string, unknown>
  if (gameId === 'hearts') {
    return {
      zeroHands: num(t.zeroHands),
      queenFreeHands: num(t.queenFreeHands),
      moonsByHuman: num(t.moonsByHuman),
      hadOpponentMoon: Boolean(t.hadOpponentMoon),
      hands: num(t.hands),
      maxDeficit: num(t.maxDeficit),
    }
  }
  if (gameId === 'spades') {
    return {
      hands: num(t.hands),
      hadBagPenalty: Boolean(t.hadBagPenalty),
      prevTeamScore: typeof t.prevTeamScore === 'number' && Number.isFinite(t.prevTeamScore)
        ? t.prevTeamScore
        : 0,
    }
  }
  return { hands: num(t.hands) }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
}
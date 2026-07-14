/** Local pass-and-play — multiple human seats on one device. */

import { Seat, SEATS } from './core/types'
import type { UserPrefs } from './prefs'

export type HumanSeatsConfig = Record<Seat, boolean>

export const DEFAULT_HUMAN_SEATS: HumanSeatsConfig = {
  0: true,
  1: false,
  2: false,
  3: false,
}

export function humanSeats(prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>): Seat[] {
  if (!prefs.passAndPlay) return [0]
  const picked = SEATS.filter((s) => prefs.humanSeats[s])
  return picked.length > 0 ? picked : [0]
}

export function isHumanControlled(
  seat: Seat,
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
): boolean {
  return humanSeats(prefs).includes(seat)
}

export function primaryHumanSeat(prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>): Seat {
  return humanSeats(prefs)[0] ?? 0
}

/** Whose hand the south UI should show right now. */
export function uiSeat(
  state: { whoseTurn: Seat | null },
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
): Seat {
  if (!prefs.passAndPlay) return 0
  const turn = state.whoseTurn
  if (turn != null && isHumanControlled(turn, prefs)) return turn
  return primaryHumanSeat(prefs)
}

export function needsPassPrompt(
  state: { whoseTurn: Seat | null },
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
  readySeat: Seat | null,
): boolean {
  if (!prefs.passAndPlay) return false
  const turn = state.whoseTurn
  if (turn == null || !isHumanControlled(turn, prefs)) return false
  return readySeat !== turn
}

export function applyHumanSeats<T extends { players: Record<Seat, { isHuman: boolean }> }>(
  state: T,
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
): T {
  const humans = new Set(humanSeats(prefs))
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = { ...players[seat], isHuman: humans.has(seat) }
  }
  return { ...state, players }
}
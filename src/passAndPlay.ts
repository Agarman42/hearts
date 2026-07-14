/** Local pass-and-play — multiple human seats on one device. */

import { Seat, SEATS } from './core/types'
import type { PartnershipId } from './core/partnership'
import { partnershipOf } from './core/partnership'
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

export type PassPlayPrefs = Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>

/** Partnership side the primary human(s) play for. */
export function humanPartnershipTeam(prefs: PassPlayPrefs): PartnershipId {
  return partnershipOf(primaryHumanSeat(prefs))
}

export function isYourSeat(seat: Seat, prefs: PassPlayPrefs): boolean {
  if (!prefs.passAndPlay) return seat === 0
  return isHumanControlled(seat, prefs)
}

export function humanWonHearts(winner: Seat | null, prefs: PassPlayPrefs): boolean {
  if (winner == null) return false
  if (!prefs.passAndPlay) return winner === 0
  return isHumanControlled(winner, prefs)
}

export function humanTeamWon(winner: PartnershipId | null, prefs: PassPlayPrefs): boolean {
  if (winner == null) return false
  if (!prefs.passAndPlay) return winner === 'ns'
  return winner === humanPartnershipTeam(prefs)
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

type HumanPlayer = { isHuman: boolean; selectedPass?: unknown[] }

export function applyHumanSeats<T extends { players: Record<Seat, HumanPlayer> }>(
  state: T,
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
): T {
  const humans = new Set(humanSeats(prefs))
  const players = { ...state.players }
  for (const seat of SEATS) {
    const isHuman = humans.has(seat)
    const p = players[seat]
    players[seat] = {
      ...p,
      isHuman,
      ...(isHuman && 'selectedPass' in p ? { selectedPass: [] } : {}),
    }
  }
  let next = { ...state, players } as T
  if ('passSelections' in state && state.passSelections && typeof state.passSelections === 'object') {
    const passSelections = {
      ...(state.passSelections as Partial<Record<Seat, unknown[]>>),
    }
    for (const seat of SEATS) {
      if (humans.has(seat)) delete passSelections[seat]
    }
    next = { ...next, passSelections } as T
  }
  return next
}
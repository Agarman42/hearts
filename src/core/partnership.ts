import type { Seat } from './types'

/** Partnership teams for Spades / Euchre (not used in Hearts). */
export type PartnershipId = 'ns' | 'ew'

export const PARTNERSHIPS: Record<PartnershipId, readonly [Seat, Seat]> = {
  ns: [0, 2],
  ew: [1, 3],
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat
}

export function partnershipOf(seat: Seat): PartnershipId {
  return seat === 0 || seat === 2 ? 'ns' : 'ew'
}

export function seatsOnTeam(team: PartnershipId): readonly [Seat, Seat] {
  return PARTNERSHIPS[team]
}
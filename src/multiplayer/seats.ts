import type { Seat } from '../core/types'
import { partnerOf } from '../core/partnership'

export const JOINER_SEAT_ORDER: readonly Seat[] = [1, 3, 2]

export function screenSlot(engineSeat: Seat, mySeat: Seat): Seat {
  return (((engineSeat - mySeat + 4) % 4) as Seat)
}

/** Inverse of `screenSlot`: engine seat sitting in a visual slot (0=south). */
export function engineSeatFromSlot(slot: Seat, mySeat: Seat): Seat {
  return (((slot + mySeat) % 4) as Seat)
}

export function partnerSeat(vs: Seat): Seat {
  return partnerOf(vs)
}

export function preferredOpponentSeat(vs: Seat, occupied: ReadonlySet<Seat>): Seat | null {
  const partner = partnerOf(vs)
  for (const cand of [((vs + 1) % 4) as Seat, ((vs + 3) % 4) as Seat]) {
    if (cand === vs || cand === partner) continue
    if (!occupied.has(cand)) return cand
  }
  return null
}

/** Follow playerId after partner/seat rotate — never a sticky compass seat. */
export function seatOfPlayer(
  chairs: Record<Seat, { playerId: string } | null> | undefined,
  playerId: string | null | undefined,
): Seat | null {
  if (!chairs || !playerId) return null
  for (const s of [0, 1, 2, 3] as Seat[]) {
    if (chairs[s]?.playerId === playerId) return s
  }
  return null
}

export function firstEmptyJoinerSeat(chairs: Record<Seat, unknown | null>): Seat | null {
  for (const s of JOINER_SEAT_ORDER) {
    if (chairs[s] == null) return s
  }
  if (chairs[0] == null) return 0
  return null
}

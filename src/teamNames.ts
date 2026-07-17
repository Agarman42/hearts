import type { Seat } from './core/types'
import type { PartnershipId } from './core/partnership'

/** Human-readable names for a partnership (e.g. "Angie & Scott"). */
export function partnershipNames(
  players: Record<Seat, { name: string }>,
  team: PartnershipId,
): string {
  const seats: Seat[] = team === 'ns' ? [0, 2] : [1, 3]
  return seats.map((s) => players[s].name).join(' & ')
}

export function matchWinTitle(
  players: Record<Seat, { name: string }>,
  winner: PartnershipId | null | undefined,
): string {
  if (winner == null) return 'Match over'
  return `${partnershipNames(players, winner)} win the match`
}

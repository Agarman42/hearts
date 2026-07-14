import type { PartnershipId } from '../../core/partnership'

/** Human sits South (0); partner North (2) — same partnership. */
export const YOUR_TEAM: PartnershipId = 'ns'

export function teamLabel(team: PartnershipId): string {
  return team === YOUR_TEAM ? 'Us' : 'Them'
}

export function teamLabelLower(team: PartnershipId): string {
  return team === YOUR_TEAM ? 'us' : 'them'
}
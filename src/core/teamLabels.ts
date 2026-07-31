import type { PartnershipId } from './partnership'

/** Labels relative to the primary human's partnership (default NS / seat 0). */
export function teamLabel(
  team: PartnershipId,
  yourTeam: PartnershipId = 'ns',
): string {
  return team === yourTeam ? 'Us' : 'Them'
}

export function teamLabelLower(
  team: PartnershipId,
  yourTeam: PartnershipId = 'ns',
): string {
  return team === yourTeam ? 'us' : 'them'
}

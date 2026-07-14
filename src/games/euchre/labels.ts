import type { PartnershipId } from '../../core/partnership'

export const YOUR_TEAM: PartnershipId = 'ns'

export function teamLabel(team: PartnershipId): string {
  return team === YOUR_TEAM ? 'Us' : 'Them'
}
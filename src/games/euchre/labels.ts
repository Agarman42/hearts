import type { PartnershipId } from '../../core/partnership'
import {
  teamLabel as coreTeamLabel,
  teamLabelLower as coreTeamLabelLower,
} from '../../core/teamLabels'

/** @deprecated Prefer passing yourTeam — defaults to NS for solo south. */
export const YOUR_TEAM: PartnershipId = 'ns'

export function teamLabel(team: PartnershipId, yourTeam: PartnershipId = 'ns'): string {
  return coreTeamLabel(team, yourTeam)
}

export function teamLabelLower(team: PartnershipId, yourTeam: PartnershipId = 'ns'): string {
  return coreTeamLabelLower(team, yourTeam)
}

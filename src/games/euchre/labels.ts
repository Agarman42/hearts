import type { PartnershipId } from '../../core/partnership'
import {
  teamLabel as coreTeamLabel,
  teamLabelLower as coreTeamLabelLower,
} from '../../core/teamLabels'

export type EuchreHandCopySummary = {
  makerTeam: PartnershipId
  euchred: boolean
  marched: boolean
  loner: boolean
  points: Record<PartnershipId, number>
}

/** @deprecated Prefer passing yourTeam — defaults to NS for solo south. */
export const YOUR_TEAM: PartnershipId = 'ns'

export function teamLabel(team: PartnershipId, yourTeam: PartnershipId = 'ns'): string {
  return coreTeamLabel(team, yourTeam)
}

export function teamLabelLower(team: PartnershipId, yourTeam: PartnershipId = 'ns'): string {
  return coreTeamLabelLower(team, yourTeam)
}

/** Viewer-aware hand-over copy. Engine stores the NS-authored string. */
export function formatEuchreHandMessage(
  summary: EuchreHandCopySummary,
  yourTeam: PartnershipId,
): string {
  const { makerTeam, euchred, marched, loner, points } = summary
  if (euchred) {
    const defenders: PartnershipId = makerTeam === 'ns' ? 'ew' : 'ns'
    return `${teamLabel(defenders, yourTeam)} euchre!`
  }
  if (marched) {
    return loner
      ? `${teamLabel(makerTeam, yourTeam)} loner march (+4)!`
      : `${teamLabel(makerTeam, yourTeam)} march!`
  }
  return `${teamLabel(makerTeam, yourTeam)} ${points[makerTeam]} pt`
}

export function formatEuchreMatchMessage(
  winner: PartnershipId | null,
  yourTeam: PartnershipId,
): string {
  const label = winner != null ? teamLabel(winner, yourTeam) : 'Match'
  return `${label} wins the match!`
}

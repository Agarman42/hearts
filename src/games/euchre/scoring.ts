import type { PartnershipId } from '../../core/partnership'
import type { EuchreRulesConfig } from './types'

export interface HandScoreResult {
  points: Record<PartnershipId, number>
  marched: boolean
  euchred: boolean
  loner: boolean
  makerTricks: number
}

/** Makers need 3+ tricks for 1 pt; 5 tricks = 2 (march). Loner march = 4. <3 = euchre (+2 defenders). */
export function scoreHand(
  makerTeam: PartnershipId,
  makerTricks: number,
  _rules: EuchreRulesConfig,
  loner = false,
): HandScoreResult {
  const defender: PartnershipId = makerTeam === 'ns' ? 'ew' : 'ns'
  const points = { ns: 0, ew: 0 }

  if (makerTricks >= 5) {
    points[makerTeam] = loner ? 4 : 2
    return { points, marched: true, euchred: false, loner, makerTricks }
  }
  if (makerTricks >= 3) {
    points[makerTeam] = 1
    return { points, marched: false, euchred: false, loner, makerTricks }
  }
  points[defender] = 2
  return { points, marched: false, euchred: true, loner, makerTricks }
}

/** Cap displayed match totals at race-to (teams may score past it on the winning hand). */
export function displayMatchScore(score: number, raceTo: number): number {
  return Math.min(score, raceTo)
}

/** Points a team still needs to reach race-to. */
export function pointsToWin(teamScore: number, raceTo: number): number {
  return Math.max(0, raceTo - teamScore)
}

/** Going alone is overkill when a normal hand can close out the match. */
export function lonerBlockedNearWin(
  makerTeam: PartnershipId,
  teamScores: Record<PartnershipId, number>,
  raceTo: number,
): boolean {
  return pointsToWin(teamScores[makerTeam], raceTo) <= 2
}

export function checkMatchWinner(
  teamScores: Record<PartnershipId, number>,
  raceTo: number,
): PartnershipId | null {
  const nsWin = teamScores.ns >= raceTo
  const ewWin = teamScores.ew >= raceTo
  if (nsWin && ewWin) return teamScores.ns >= teamScores.ew ? 'ns' : 'ew'
  if (nsWin) return 'ns'
  if (ewWin) return 'ew'
  return null
}
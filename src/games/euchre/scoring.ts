import type { PartnershipId } from '../../core/partnership'
import type { EuchreRulesConfig } from './types'

export interface HandScoreResult {
  points: Record<PartnershipId, number>
  marched: boolean
  euchred: boolean
  makerTricks: number
}

/** Makers need 3+ tricks for 1 pt; 5 tricks = 2 (march). <3 = euchre (2 to defenders). */
export function scoreHand(
  makerTeam: PartnershipId,
  makerTricks: number,
  _rules: EuchreRulesConfig,
): HandScoreResult {
  const defender: PartnershipId = makerTeam === 'ns' ? 'ew' : 'ns'
  const points = { ns: 0, ew: 0 }

  if (makerTricks >= 5) {
    points[makerTeam] = 2
    return { points, marched: true, euchred: false, makerTricks }
  }
  if (makerTricks >= 3) {
    points[makerTeam] = 1
    return { points, marched: false, euchred: false, makerTricks }
  }
  points[defender] = 2
  return { points, marched: false, euchred: true, makerTricks }
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
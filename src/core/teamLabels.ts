import type { PartnershipId } from './partnership'
import { seatsOnTeam } from './partnership'
import type { Seat } from './types'

/** Labels relative to the viewer's partnership (default NS / seat 0). */
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

/**
 * Engine copy is authored as NS = Us. Rewrite for an EW viewer after a
 * partner/seat rotate so "Us euchre!" never sticks to compass NS.
 */
export function relabelUsThemCopy(text: string, yourTeam: PartnershipId): string {
  if (!text || yourTeam === 'ns') return text
  return text.replace(/\bThem\b/g, '\u0001').replace(/\bUs\b/g, 'Them').replace(/\u0001/g, 'Us')
}

export type PartnershipScoreRow = {
  id: PartnershipId
  label: 'Us' | 'Them'
  seats: readonly [Seat, Seat]
  score: number
}

/** Always Us then Them — never sort by sticky NS/EW compass order. */
export function partnershipScoreRows(
  scores: { ns: number; ew: number },
  yourTeam: PartnershipId,
): PartnershipScoreRow[] {
  const opp: PartnershipId = yourTeam === 'ns' ? 'ew' : 'ns'
  return [
    { id: yourTeam, label: 'Us', seats: seatsOnTeam(yourTeam), score: scores[yourTeam] },
    { id: opp, label: 'Them', seats: seatsOnTeam(opp), score: scores[opp] },
  ]
}

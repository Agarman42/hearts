import type { Seat } from '../../core/types'
import type { PartnershipId } from '../../core/partnership'
import { partnershipOf } from '../../core/partnership'
import { applyBagPenalty } from './rules'
import type { SpadesRulesConfig } from './types'

export interface PlayerBid {
  bid: number
  nil: boolean
  blindNil?: boolean
}

export interface HandScoreResult {
  teamPoints: Record<PartnershipId, number>
  teamBagsAdded: Record<PartnershipId, number>
  nilResults: Partial<Record<Seat, { made: boolean; points: number }>>
}

const NIL_BONUS = 100
const BLIND_NIL_BONUS = 200
const NIL_FAIL = 100
const BLIND_NIL_FAIL = 200

function teamBid(
  seats: readonly [Seat, Seat],
  bids: Partial<Record<Seat, PlayerBid>>,
): number {
  let total = 0
  for (const seat of seats) {
    const b = bids[seat]
    if (!b || b.nil) continue
    total += b.bid
  }
  return total
}

function teamTricks(
  seats: readonly [Seat, Seat],
  tricksWon: Record<Seat, number>,
): number {
  return tricksWon[seats[0]] + tricksWon[seats[1]]
}

function scoreTeam(
  bid: number,
  tricks: number,
): { points: number; bags: number } {
  if (bid === 0) return { points: 0, bags: tricks }
  if (tricks >= bid) {
    const bags = tricks - bid
    return { points: bid * 10 + bags, bags }
  }
  return { points: -bid * 10, bags: 0 }
}

function nilPoints(b: PlayerBid, tricks: number, rules: SpadesRulesConfig): number {
  if (!b.nil) return 0
  const made = tricks === 0
  if (b.blindNil && rules.blindNil) {
    return made ? BLIND_NIL_BONUS : -BLIND_NIL_FAIL
  }
  if (!rules.nilBids) return 0
  return made ? NIL_BONUS : -NIL_FAIL
}

export function scoreHand(
  bids: Partial<Record<Seat, PlayerBid>>,
  tricksWon: Record<Seat, number>,
  rules: SpadesRulesConfig,
): HandScoreResult {
  const teams: PartnershipId[] = ['ns', 'ew']
  const teamPoints: Record<PartnershipId, number> = { ns: 0, ew: 0 }
  const teamBagsAdded: Record<PartnershipId, number> = { ns: 0, ew: 0 }
  const nilResults: HandScoreResult['nilResults'] = {}

  for (const team of teams) {
    const seats: [Seat, Seat] = team === 'ns' ? [0, 2] : [1, 3]
    const bid = teamBid(seats, bids)
    const tricks = teamTricks(seats, tricksWon)
    const { points, bags } = scoreTeam(bid, tricks)
    teamPoints[team] += points
    teamBagsAdded[team] = bags
  }

  for (const seat of [0, 1, 2, 3] as Seat[]) {
    const b = bids[seat]
    if (!b?.nil) continue
    const pts = nilPoints(b, tricksWon[seat], rules)
    const team = partnershipOf(seat)
    teamPoints[team] += pts
    nilResults[seat] = { made: tricksWon[seat] === 0, points: pts }
  }

  return { teamPoints, teamBagsAdded, nilResults }
}

export function applyTeamBagPenalties(
  teamScores: Record<PartnershipId, number>,
  teamBags: Record<PartnershipId, number>,
  bagsAdded: Record<PartnershipId, number>,
  rules: SpadesRulesConfig,
): { teamScores: Record<PartnershipId, number>; teamBags: Record<PartnershipId, number> } {
  const nextScores = { ...teamScores }
  const nextBags = { ...teamBags }
  for (const team of ['ns', 'ew'] as PartnershipId[]) {
    const totalBags = nextBags[team] + bagsAdded[team]
    const { bags, penalty } = applyBagPenalty(totalBags, rules)
    nextBags[team] = bags
    nextScores[team] -= penalty
  }
  return { teamScores: nextScores, teamBags: nextBags }
}
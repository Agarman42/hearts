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

export interface TeamHandDetail {
  teamBid: number
  tricksTaken: number
  contractPoints: number
  bagsAdded: number
  nilPoints: number
  bagPenalty: number
  handTotal: number
}

export interface SpadesLastHandSummary {
  players: Record<
    Seat,
    {
      bid: PlayerBid | null
      tricks: number
      nilResult?: { made: boolean; points: number }
    }
  >
  teams: Record<PartnershipId, TeamHandDetail>
  matchTotals: Record<PartnershipId, number>
  matchTotalsBefore: Record<PartnershipId, number>
  bagsAfter: Record<PartnershipId, number>
}

export function formatBidLabel(bid: PlayerBid | undefined | null): string {
  if (!bid) return '—'
  if (bid.blindNil) return 'Blind nil'
  if (bid.nil) return 'Nil'
  return String(bid.bid)
}

export function formatPoints(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

/** Whether the team made its numbered contract, or nil scoring if bid was zero. */
export function teamContractResult(detail: TeamHandDetail): 'made' | 'set' | null {
  if (detail.teamBid > 0) {
    return detail.tricksTaken >= detail.teamBid ? 'made' : 'set'
  }
  if (detail.nilPoints !== 0) {
    return detail.nilPoints > 0 ? 'made' : 'set'
  }
  return null
}

const TEAM_SEATS: Record<PartnershipId, readonly [Seat, Seat]> = {
  ns: [0, 2],
  ew: [1, 3],
}

/** Team recap tint — fails if numbered contract missed or any nil on the team failed. */
export function teamHandResult(
  team: PartnershipId,
  summary: SpadesLastHandSummary,
): 'made' | 'set' | null {
  const detail = summary.teams[team]
  const nilFailed = TEAM_SEATS[team].some((seat) => {
    const nil = summary.players[seat].nilResult
    return nil != null && !nil.made
  })
  const numberedMade =
    detail.teamBid === 0 || detail.tricksTaken >= detail.teamBid

  if (nilFailed) return 'set'
  if (detail.teamBid > 0) return numberedMade ? 'made' : 'set'
  if (detail.nilPoints !== 0) return detail.nilPoints > 0 ? 'made' : 'set'
  return null
}

export function playerHandResult(
  row: SpadesLastHandSummary['players'][Seat],
): 'made' | 'set' | null {
  if (row.nilResult) return row.nilResult.made ? 'made' : 'set'
  if (row.bid && !row.bid.nil && row.bid.bid > 0) {
    return row.tricks >= row.bid.bid ? 'made' : 'set'
  }
  return null
}

const NIL_BONUS = 100
const BLIND_NIL_BONUS = 200
const NIL_FAIL = 100
const BLIND_NIL_FAIL = 200

export function teamContractBid(
  team: PartnershipId,
  bids: Partial<Record<Seat, PlayerBid>>,
): number {
  const seats: [Seat, Seat] = team === 'ns' ? [0, 2] : [1, 3]
  return teamBid(seats, bids)
}

export function teamContractBids(
  bids: Partial<Record<Seat, PlayerBid>>,
): Record<PartnershipId, number> {
  return { ns: teamContractBid('ns', bids), ew: teamContractBid('ew', bids) }
}

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

function teamNilPoints(
  seats: readonly [Seat, Seat],
  bids: Partial<Record<Seat, PlayerBid>>,
  tricksWon: Record<Seat, number>,
  rules: SpadesRulesConfig,
): number {
  let total = 0
  for (const seat of seats) {
    const b = bids[seat]
    if (!b?.nil) continue
    total += nilPoints(b, tricksWon[seat], rules)
  }
  return total
}

export function summarizeHand(
  bids: Partial<Record<Seat, PlayerBid>>,
  tricksWon: Record<Seat, number>,
  rules: SpadesRulesConfig,
  teamScoresBefore: Record<PartnershipId, number>,
  teamBagsBefore: Record<PartnershipId, number>,
): SpadesLastHandSummary {
  const scored = scoreHand(bids, tricksWon, rules)
  const scoresAfterHand = {
    ns: teamScoresBefore.ns + scored.teamPoints.ns,
    ew: teamScoresBefore.ew + scored.teamPoints.ew,
  }
  const applied = applyTeamBagPenalties(
    scoresAfterHand,
    teamBagsBefore,
    scored.teamBagsAdded,
    rules,
  )

  const teams = {} as Record<PartnershipId, TeamHandDetail>
  for (const team of ['ns', 'ew'] as PartnershipId[]) {
    const seats: [Seat, Seat] = team === 'ns' ? [0, 2] : [1, 3]
    const bid = teamBid(seats, bids)
    const tricks = teamTricks(seats, tricksWon)
    const { points: contractPoints } = scoreTeam(bid, tricks)
    const nilPts = teamNilPoints(seats, bids, tricksWon, rules)
    teams[team] = {
      teamBid: bid,
      tricksTaken: tricks,
      contractPoints,
      bagsAdded: scored.teamBagsAdded[team],
      nilPoints: nilPts,
      bagPenalty: scoresAfterHand[team] - applied.teamScores[team],
      handTotal: scored.teamPoints[team],
    }
  }

  const players = {} as SpadesLastHandSummary['players']
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    players[seat] = {
      bid: bids[seat] ?? null,
      tricks: tricksWon[seat],
      nilResult: scored.nilResults[seat],
    }
  }

  return {
    players,
    teams,
    matchTotals: applied.teamScores,
    matchTotalsBefore: { ...teamScoresBefore },
    bagsAfter: applied.teamBags,
  }
}
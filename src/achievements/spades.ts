/** Spades career achievements — stored under achievementsKey('spades'). */

import type { Seat } from '../core/types'
import { partnershipOf } from '../core/partnership'
import type { SpadesState } from '../games/spades/engine'
import { primaryHumanSeat, type PassPlayPrefs } from '../passAndPlay'
import { achievementsKey } from '../storageKeys'
import { loadStats, type CareerStats } from '../stats'
import type { Achievement, UnlockedAchievements } from '../achievements'

export type { Achievement, UnlockedAchievements }

export const SPADES_ACHIEVEMENTS: Achievement[] = [
  { id: 'sp_first_win', title: 'Bid Winner', description: 'Win your first Spades match.', icon: '🏆', tier: 'bronze', gameId: 'spades' },
  { id: 'sp_first_hand', title: 'In the Game', description: 'Complete your first Spades hand.', icon: '🃏', tier: 'bronze', gameId: 'spades' },
  { id: 'sp_nil', title: 'Nil Hero', description: 'Make a successful nil bid.', icon: '🎯', tier: 'silver', gameId: 'spades' },
  { id: 'sp_blind_nil', title: 'Blind Faith', description: 'Make a successful blind nil.', icon: '🙈', tier: 'gold', gameId: 'spades' },
  { id: 'sp_set_bid', title: 'Contract', description: 'Make your team bid on a hand.', icon: '🤝', tier: 'bronze', gameId: 'spades' },
  { id: 'sp_bag_dodge', title: 'Bag Dodger', description: 'Win a match without a bag penalty.', icon: '🎒', tier: 'silver', gameId: 'spades' },
  { id: 'sp_race_500', title: 'Half Grand', description: 'Win a race-to-500 match.', icon: '🏁', tier: 'gold', gameId: 'spades' },
  { id: 'sp_streak_3', title: 'Table Run', description: 'Win 3 Spades matches in a row.', icon: '🔥', tier: 'silver', gameId: 'spades' },
  { id: 'sp_veteran', title: 'Spades Regular', description: 'Play 10 Spades matches.', icon: '♠', tier: 'bronze', gameId: 'spades' },
  { id: 'sp_hands_100', title: 'Card Counter', description: 'Play 100 Spades hands.', icon: '📊', tier: 'silver', gameId: 'spades' },
  { id: 'sp_wins_25', title: 'Partner Pro', description: 'Win 25 Spades matches.', icon: '👑', tier: 'gold', gameId: 'spades' },
  { id: 'sp_slam', title: 'Grand Slam', description: 'Bid 13 and make it.', icon: '💥', tier: 'platinum', gameId: 'spades', secret: true },
  { id: 'sp_streak_5', title: 'On a Roll', description: 'Win 5 Spades matches in a row.', icon: '⚡', tier: 'gold', gameId: 'spades' },
  { id: 'sp_race_250', title: 'Quarter Grand', description: 'Win a race-to-250 match.', icon: '🏁', tier: 'silver', gameId: 'spades' },
  { id: 'sp_set_nil', title: 'Nil Buster', description: 'Set an opponent nil bid.', icon: '💣', tier: 'bronze', gameId: 'spades' },
]

export function loadSpadesAchievements(): UnlockedAchievements {
  try {
    const raw = localStorage.getItem(achievementsKey('spades'))
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, unknown>
    const out: UnlockedAchievements = {}
    for (const [id, ts] of Object.entries(p)) {
      if (typeof ts === 'number' && Number.isFinite(ts)) out[id] = ts
    }
    return out
  } catch {
    return {}
  }
}

export function saveSpadesAchievements(unlocked: UnlockedAchievements): void {
  try {
    localStorage.setItem(achievementsKey('spades'), JSON.stringify(unlocked))
  } catch {
    /* ignore */
  }
}

export function unlockSpadesAchievement(id: string): Achievement | null {
  const def = SPADES_ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return null
  const unlocked = loadSpadesAchievements()
  if (unlocked[id]) return null
  unlocked[id] = Date.now()
  saveSpadesAchievements(unlocked)
  return def
}

export interface SpadesHandAchievementInput {
  humanBid: number
  humanNil: boolean
  humanBlindNil: boolean
  humanTricks: number
  teamMadeBid: boolean
  humanBid13: boolean
  opponentNilSet: boolean
}

export interface SpadesMatchAchievementInput {
  humanWon: boolean
  teamScore: number
  raceTo: number
  hadBagPenalty: boolean
  handsInMatch: number
}

export function checkSpadesHandAchievements(
  input: SpadesHandAchievementInput,
  stats: CareerStats = loadStats('spades'),
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockSpadesAchievement(id)
    if (a) out.push(a)
  }

  if (stats.handsPlayed === 1) tryUnlock('sp_first_hand')
  if (input.humanNil && input.humanTricks === 0) tryUnlock('sp_nil')
  if (input.humanBlindNil && input.humanTricks === 0) tryUnlock('sp_blind_nil')
  if (input.teamMadeBid) tryUnlock('sp_set_bid')
  if (input.humanBid13 && input.humanTricks >= 13) tryUnlock('sp_slam')
  if (input.opponentNilSet) tryUnlock('sp_set_nil')
  if (stats.handsPlayed + 1 >= 100) tryUnlock('sp_hands_100')

  return out
}

export function checkSpadesMatchAchievements(
  input: SpadesMatchAchievementInput,
  stats: CareerStats = loadStats('spades'),
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockSpadesAchievement(id)
    if (a) out.push(a)
  }

  if (input.humanWon) {
    tryUnlock('sp_first_win')
    if (input.raceTo >= 500) tryUnlock('sp_race_500')
    if (input.raceTo <= 250) tryUnlock('sp_race_250')
    if (!input.hadBagPenalty) tryUnlock('sp_bag_dodge')
  }
  if (stats.matchesPlayed >= 9) tryUnlock('sp_veteran')
  if (stats.winStreak >= 3) tryUnlock('sp_streak_3')
  if (stats.winStreak >= 5) tryUnlock('sp_streak_5')
  if (stats.matchesWon >= 25) tryUnlock('sp_wins_25')

  return out
}

function partnerSeat(seat: Seat): Seat {
  const team = partnershipOf(seat)
  const mates: Record<'ns' | 'ew', [Seat, Seat]> = { ns: [0, 2], ew: [1, 3] }
  const [a, b] = mates[team]
  return seat === a ? b : a
}

export function spadesHandInputFromState(
  state: SpadesState,
  prefs?: PassPlayPrefs,
): SpadesHandAchievementInput {
  const you = prefs ? primaryHumanSeat(prefs) : 0
  const partner = partnerSeat(you)
  const human = state.players[you]
  const humanBid = state.bids[you]
  const partnerBid = state.bids[partner]
  const partnerPlayer = state.players[partner]
  const teamTricks = human.tricksWon + partnerPlayer.tricksWon
  const teamBidTotal =
    (humanBid?.nil ? 0 : humanBid?.bid ?? 0) + (partnerBid?.nil ? 0 : partnerBid?.bid ?? 0)

  const oppNilSet = ([1, 3] as Seat[]).some((seat) => {
    const bid = state.bids[seat]
    const p = state.players[seat]
    return Boolean(bid?.nil) && p.tricksWon > 0
  })

  return {
    humanBid: human.bid ?? 0,
    humanNil: human.nil,
    humanBlindNil: Boolean(humanBid?.blindNil),
    humanTricks: human.tricksWon,
    teamMadeBid: teamBidTotal > 0 && teamTricks >= teamBidTotal,
    humanBid13: human.bid === 13,
    opponentNilSet: oppNilSet,
  }
}

export function visibleSpadesAchievements(unlocked = loadSpadesAchievements()): Achievement[] {
  return SPADES_ACHIEVEMENTS.filter((a) => !a.secret || unlocked[a.id])
}

export function spadesAchievementProgress(
  id: string,
  stats: CareerStats = loadStats('spades'),
  unlocked: UnlockedAchievements = loadSpadesAchievements(),
): { current: number; target: number } | null {
  if (unlocked[id]) return null
  switch (id) {
    case 'sp_veteran':
      return { current: stats.matchesPlayed, target: 10 }
    case 'sp_hands_100':
      return { current: stats.handsPlayed, target: 100 }
    case 'sp_wins_25':
      return { current: stats.matchesWon, target: 25 }
    case 'sp_streak_3':
      return { current: stats.winStreak, target: 3 }
    case 'sp_streak_5':
      return { current: stats.bestWinStreak, target: 5 }
    default:
      return null
  }
}
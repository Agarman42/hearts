import type { EuchreState } from '../games/euchre/engine'
import { YOUR_TEAM } from '../games/euchre/labels'
import { achievementsKey } from '../storageKeys'
import { loadStats, type CareerStats } from '../stats'
import type { Achievement, UnlockedAchievements } from '../achievements'

export type { Achievement, UnlockedAchievements }

export const EUCHRE_ACHIEVEMENTS: Achievement[] = [
  { id: 'eu_first_win', title: 'Trick Taker', description: 'Win your first Euchre match.', icon: '🏆', tier: 'bronze', gameId: 'euchre' },
  { id: 'eu_first_hand', title: 'Dealt In', description: 'Complete your first Euchre hand.', icon: '🃏', tier: 'bronze', gameId: 'euchre' },
  { id: 'eu_march', title: 'March', description: 'Take all 5 tricks as makers.', icon: '5️⃣', tier: 'silver', gameId: 'euchre' },
  { id: 'eu_euchre', title: 'Gotcha', description: 'Euchre the makers (+2).', icon: '🎯', tier: 'silver', gameId: 'euchre' },
  { id: 'eu_order_made', title: 'Caller', description: 'Order trump and make your point.', icon: '♦', tier: 'bronze', gameId: 'euchre' },
  { id: 'eu_streak_3', title: 'Table Run', description: 'Win 3 Euchre matches in a row.', icon: '🔥', tier: 'silver', gameId: 'euchre' },
  { id: 'eu_veteran', title: 'Barn Regular', description: 'Play 10 Euchre matches.', icon: '♦', tier: 'bronze', gameId: 'euchre' },
  { id: 'eu_hands_50', title: 'Card Sharp', description: 'Play 50 Euchre hands.', icon: '📊', tier: 'silver', gameId: 'euchre' },
  { id: 'eu_wins_10', title: 'County Champ', description: 'Win 10 Euchre matches.', icon: '👑', tier: 'gold', gameId: 'euchre' },
  { id: 'eu_sweep', title: 'Green Felt', description: 'Win a race-to-10 match.', icon: '🏁', tier: 'gold', gameId: 'euchre' },
  { id: 'eu_loner', title: 'Lone Wolf', description: 'Loner march — all five alone (+4).', icon: '🐺', tier: 'gold', gameId: 'euchre' },
  { id: 'eu_streak_5', title: 'Barn Burner', description: 'Win 5 Euchre matches in a row.', icon: '⚡', tier: 'gold', gameId: 'euchre' },
  { id: 'eu_quick_7', title: 'Quick Seven', description: 'Win a race-to-7 match.', icon: '🏁', tier: 'silver', gameId: 'euchre' },
  { id: 'eu_block_march', title: 'March Blocker', description: 'Hold makers to 2 tricks or fewer.', icon: '🛡️', tier: 'bronze', gameId: 'euchre' },
]

export function loadEuchreAchievements(): UnlockedAchievements {
  try {
    const raw = localStorage.getItem(achievementsKey('euchre'))
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

export function saveEuchreAchievements(unlocked: UnlockedAchievements): void {
  try {
    localStorage.setItem(achievementsKey('euchre'), JSON.stringify(unlocked))
  } catch {
    /* ignore */
  }
}

export function unlockEuchreAchievement(id: string): Achievement | null {
  const def = EUCHRE_ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return null
  const unlocked = loadEuchreAchievements()
  if (unlocked[id]) return null
  unlocked[id] = Date.now()
  saveEuchreAchievements(unlocked)
  return def
}

export interface EuchreHandAchievementInput {
  humanOrdered: boolean
  humanTeamMaker: boolean
  makerTricks: number
  marched: boolean
  euchred: boolean
  defendedEuchre: boolean
  loner: boolean
}

export interface EuchreMatchAchievementInput {
  humanWon: boolean
  raceTo: number
  handsInMatch: number
}

export function checkEuchreHandAchievements(
  input: EuchreHandAchievementInput,
  stats: CareerStats = loadStats('euchre'),
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockEuchreAchievement(id)
    if (a) out.push(a)
  }

  if (stats.handsPlayed === 0) tryUnlock('eu_first_hand')
  if (input.marched && input.humanTeamMaker) tryUnlock('eu_march')
  if (input.defendedEuchre) tryUnlock('eu_euchre')
  if (input.humanOrdered && input.makerTricks >= 3) tryUnlock('eu_order_made')
  if (input.loner && input.marched && input.humanOrdered) tryUnlock('eu_loner')
  if (!input.humanTeamMaker && input.makerTricks <= 2 && !input.euchred) {
    tryUnlock('eu_block_march')
  }
  if (stats.handsPlayed + 1 >= 50) tryUnlock('eu_hands_50')

  return out
}

export function checkEuchreMatchAchievements(
  input: EuchreMatchAchievementInput,
  stats: CareerStats = loadStats('euchre'),
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockEuchreAchievement(id)
    if (a) out.push(a)
  }

  if (input.humanWon) {
    tryUnlock('eu_first_win')
    if (input.raceTo <= 10) tryUnlock('eu_sweep')
    if (input.raceTo <= 7) tryUnlock('eu_quick_7')
  }
  if (stats.matchesPlayed >= 9) tryUnlock('eu_veteran')
  if (stats.winStreak >= 3) tryUnlock('eu_streak_3')
  if (stats.winStreak >= 5) tryUnlock('eu_streak_5')
  if (stats.matchesWon >= 10) tryUnlock('eu_wins_10')

  return out
}

export function euchreHandInputFromState(state: EuchreState): EuchreHandAchievementInput {
  const summary = state.lastHandSummary
  const makerTeam = summary?.makerTeam ?? state.makerTeam ?? 'ns'
  const humanTeamMaker = makerTeam === YOUR_TEAM
  const humanOrdered = state.maker === 0
  const makerTricks = summary?.makerTricks ?? 0
  const marched = summary?.marched ?? false
  const euchred = summary?.euchred ?? false

  return {
    humanOrdered,
    humanTeamMaker,
    makerTricks,
    marched,
    euchred,
    defendedEuchre: euchred && !humanTeamMaker,
    loner: summary?.loner ?? state.loner,
  }
}

export function visibleEuchreAchievements(unlocked = loadEuchreAchievements()): Achievement[] {
  return EUCHRE_ACHIEVEMENTS.filter((a) => !a.secret || unlocked[a.id])
}

export function euchreAchievementProgress(
  id: string,
  stats: CareerStats = loadStats('euchre'),
  unlocked: UnlockedAchievements = loadEuchreAchievements(),
): { current: number; target: number } | null {
  if (unlocked[id]) return null
  switch (id) {
    case 'eu_veteran':
      return { current: stats.matchesPlayed, target: 10 }
    case 'eu_hands_50':
      return { current: stats.handsPlayed, target: 50 }
    case 'eu_wins_10':
      return { current: stats.matchesWon, target: 10 }
    case 'eu_streak_3':
      return { current: stats.winStreak, target: 3 }
    case 'eu_streak_5':
      return { current: stats.bestWinStreak, target: 5 }
    default:
      return null
  }
}
/** Career achievements — mix of easy, medium, and rare long-term goals. */

import type { Seat } from './core/types'
import type { GameId } from './games/registry'
import type { HeartsState } from './games/hearts/engine'
import { achievementsKey, LEGACY_KEYS } from './storageKeys'
import { loadStats, type CareerStats } from './stats'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  tier: AchievementTier
  secret?: boolean
  /** Game this belongs to — shown in per-game stats; global trophies use trophyCase.ts */
  gameId?: GameId
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'Table Captain', description: 'Win your first match.', icon: '🏆', tier: 'bronze' },
  { id: 'first_hand', title: 'Dealt In', description: 'Complete your first hand.', icon: '🃏', tier: 'bronze' },
  { id: 'clean_hand', title: 'Squeaky Clean', description: 'Score 0 on a hand.', icon: '✨', tier: 'bronze' },
  { id: 'moon_shot', title: 'Moon Walker', description: 'Shoot the moon.', icon: '🌙', tier: 'gold' },
  { id: 'mooned', title: 'Collateral Damage', description: 'Take 26 from an opponent moon.', icon: '💥', tier: 'bronze' },
  { id: 'queen_dodge', title: 'Queen Dodger', description: 'Finish a hand without the Q♠.', icon: '👑', tier: 'silver' },
  { id: 'low_win', title: 'Efficient', description: 'Win a match with 50 points or fewer.', icon: '🎯', tier: 'silver' },
  { id: 'clean_match', title: 'Heart of Ice', description: 'Win a match with 0 total points.', icon: '🧊', tier: 'platinum' },
  { id: 'veteran', title: 'Regular', description: 'Play 10 matches.', icon: '♠', tier: 'bronze' },
  { id: 'centurion', title: 'Centurion', description: 'Play 100 matches.', icon: '💯', tier: 'gold' },
  { id: 'century_hands', title: 'Card Sharp', description: 'Play 100 hands.', icon: '📚', tier: 'silver' },
  { id: 'moon_hunter', title: 'Lunar Legend', description: 'Shoot the moon 3 times.', icon: '🚀', tier: 'gold' },
  { id: 'moon_master', title: 'Astronaut', description: 'Shoot the moon 10 times.', icon: '🛸', tier: 'platinum', secret: true },
  { id: 'streak_3', title: 'On Fire', description: 'Win 3 matches in a row.', icon: '🔥', tier: 'silver' },
  { id: 'streak_5', title: 'Unstoppable', description: 'Win 5 matches in a row.', icon: '⚡', tier: 'gold' },
  { id: 'streak_10', title: 'Dynasty', description: 'Win 10 matches in a row.', icon: '👑', tier: 'platinum', secret: true },
  { id: 'perfect_streak', title: 'Untouchable', description: 'Score 0 on three hands in one match.', icon: '🛡️', tier: 'gold' },
  { id: 'light_hand', title: 'Feather', description: 'Score 5 or fewer on a hand.', icon: '🪶', tier: 'bronze' },
  { id: 'heavy_hand', title: 'Ouch', description: 'Take 20+ points in one hand.', icon: '🩹', tier: 'bronze' },
  { id: 'queen_veteran', title: 'Queen Magnet', description: 'Take the Q♠ 25 times.', icon: '🧲', tier: 'silver' },
  { id: 'queen_immune', title: 'Queen Repellent', description: 'Play 20 hands without taking Q♠.', icon: '🚫', tier: 'gold', secret: true },
  { id: 'moon_block', title: 'Moon Block', description: 'Win a match where someone shot the moon against you.', icon: '🧱', tier: 'silver' },
  { id: 'comeback', title: 'Comeback Kid', description: 'Win after trailing by 30+ points in a match.', icon: '📈', tier: 'gold', secret: true },
  { id: 'speed_win', title: 'Quick Draw', description: 'Win a match in 8 hands or fewer.', icon: '⏱️', tier: 'silver' },
  { id: 'marathon_win', title: 'Long Game', description: 'Win a match that went 15+ hands.', icon: '🏔️', tier: 'silver' },
  { id: 'best_hand_0', title: 'Perfecto', description: 'Your best hand score is 0.', icon: '💎', tier: 'gold' },
  { id: 'avg_under_8', title: 'Stingy', description: 'Career avg under 8 pts/hand (50+ hands).', icon: '📉', tier: 'gold', secret: true },
  { id: 'clean_rate_25', title: 'Clean Machine', description: '25%+ clean hand rate (50+ hands).', icon: '🤖', tier: 'gold' },
  { id: 'wins_25', title: 'High Roller', description: 'Win 25 matches.', icon: '🎰', tier: 'gold' },
  { id: 'hands_500', title: 'Lifer', description: 'Play 500 hands.', icon: '♾️', tier: 'platinum', secret: true },
  { id: 'moon_and_win', title: 'Double Down', description: 'Shoot the moon and win the same match.', icon: '🌓', tier: 'gold' },
  { id: 'zero_queen_match', title: 'Royal Guard', description: 'Win without taking Q♠ all match.', icon: '🏰', tier: 'gold' },
  { id: 'underdog', title: 'Underdog', description: 'Win with 90+ points in a race-to-100 match.', icon: '🐕', tier: 'silver' },
  { id: 'collector', title: 'Trophy Case', description: 'Unlock 15 achievements.', icon: '🗄️', tier: 'silver' },
  { id: 'completionist', title: 'Completionist', description: 'Unlock every achievement.', icon: '🎖️', tier: 'platinum', secret: true },
]

export type UnlockedAchievements = Record<string, number>

export function loadAchievements(gameId: GameId = 'hearts'): UnlockedAchievements {
  try {
    const key = achievementsKey(gameId)
    let raw = localStorage.getItem(key)
    if (!raw && gameId === 'hearts') {
      raw = localStorage.getItem(LEGACY_KEYS.achievements)
    }
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

export function saveAchievements(unlocked: UnlockedAchievements, gameId: GameId = 'hearts'): void {
  try {
    localStorage.setItem(achievementsKey(gameId), JSON.stringify(unlocked))
  } catch {
    /* ignore */
  }
}

export function unlockAchievement(id: string, gameId: GameId = 'hearts'): Achievement | null {
  const def = ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return null
  const unlocked = loadAchievements(gameId)
  if (unlocked[id]) return null
  unlocked[id] = Date.now()
  saveAchievements(unlocked, gameId)
  return def
}

export interface HandAchievementInput {
  humanPoints: number
  humanTookQueen: boolean
  moonShooter: Seat | null
  zeroHandsThisMatch: number
  queenFreeHandsThisMatch: number
  matchHadOpponentMoon: boolean
  maxDeficitThisMatch: number
}

export interface MatchAchievementInput {
  humanWon: boolean
  humanScore: number
  zeroHandsThisMatch: number
  queenFreeHandsThisMatch: number
  moonsByHumanThisMatch: number
  matchHadOpponentMoon: boolean
  handsInMatch: number
  maxDeficitThisMatch: number
}

export function checkHandAchievements(
  input: HandAchievementInput,
  stats: CareerStats = loadStats(),
  gameId: GameId = 'hearts',
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockAchievement(id, gameId)
    if (a) out.push(a)
  }

  if (stats.handsPlayed === 0) tryUnlock('first_hand')
  if (input.humanPoints === 0) tryUnlock('clean_hand')
  if (input.humanPoints <= 5 && input.humanPoints > 0) tryUnlock('light_hand')
  if (input.humanPoints >= 20) tryUnlock('heavy_hand')
  if (input.humanPoints >= 26 && input.moonShooter != null && input.moonShooter !== 0) {
    tryUnlock('mooned')
  }
  if (!input.humanTookQueen) tryUnlock('queen_dodge')
  if (input.moonShooter === 0) tryUnlock('moon_shot')
  if (input.zeroHandsThisMatch >= 3) tryUnlock('perfect_streak')
  if (stats.handsPlayed + 1 >= 100) tryUnlock('century_hands')
  if (stats.queensTaken + (input.humanTookQueen ? 1 : 0) >= 25) tryUnlock('queen_veteran')
  if (stats.bestHandScore === 0 || (input.humanPoints === 0 && stats.handsPlayed > 0)) {
    tryUnlock('best_hand_0')
  }
  if (stats.handsPlayed >= 49 && stats.pointsTaken / (stats.handsPlayed + 1) < 8) {
    tryUnlock('avg_under_8')
  }
  if (stats.handsPlayed >= 49 && (stats.handsWithZero + (input.humanPoints === 0 ? 1 : 0)) / (stats.handsPlayed + 1) >= 0.25) {
    tryUnlock('clean_rate_25')
  }
  if (stats.handsPlayed + 1 >= 500) tryUnlock('hands_500')

  return out
}

export function checkMatchAchievements(
  input: MatchAchievementInput,
  stats: CareerStats = loadStats(),
  gameId: GameId = 'hearts',
): Achievement[] {
  const out: Achievement[] = []
  const tryUnlock = (id: string) => {
    const a = unlockAchievement(id, gameId)
    if (a) out.push(a)
  }

  if (input.humanWon) {
    tryUnlock('first_win')
    if (input.humanScore <= 50) tryUnlock('low_win')
    if (input.humanScore === 0) tryUnlock('clean_match')
    if (input.moonsByHumanThisMatch > 0) tryUnlock('moon_and_win')
    if (input.queenFreeHandsThisMatch === input.handsInMatch) tryUnlock('zero_queen_match')
    if (input.humanScore >= 90) tryUnlock('underdog')
    if (input.handsInMatch <= 8) tryUnlock('speed_win')
    if (input.handsInMatch >= 15) tryUnlock('marathon_win')
    if (input.maxDeficitThisMatch >= 30) tryUnlock('comeback')
    if (input.matchHadOpponentMoon) tryUnlock('moon_block')
  }

  if (stats.matchesPlayed >= 9) tryUnlock('veteran')
  if (stats.matchesPlayed >= 99) tryUnlock('centurion')
  if (stats.moonsShot >= 3) tryUnlock('moon_hunter')
  if (stats.moonsShot >= 10) tryUnlock('moon_master')
  if (stats.winStreak >= 3) tryUnlock('streak_3')
  if (stats.winStreak >= 5) tryUnlock('streak_5')
  if (stats.winStreak >= 10) tryUnlock('streak_10')
  if (stats.matchesWon >= 25) tryUnlock('wins_25')

  const unlocked = loadAchievements(gameId)
  const count = Object.keys(unlocked).length + out.length
  if (count >= 15) tryUnlock('collector')
  if (count >= ACHIEVEMENTS.length - 1) tryUnlock('completionist')

  return out
}

export function handInputFromState(
  state: HeartsState,
  zeroHandsThisMatch: number,
  queenFreeHandsThisMatch: number,
  matchHadOpponentMoon: boolean,
  maxDeficitThisMatch: number,
): HandAchievementInput {
  const human = state.players[0]
  const handPts = state.handScores?.[0] ?? human.handPoints
  return {
    humanPoints: handPts,
    humanTookQueen: human.hasQueen,
    moonShooter: state.moonShooter,
    zeroHandsThisMatch,
    queenFreeHandsThisMatch,
    matchHadOpponentMoon,
    maxDeficitThisMatch,
  }
}

export function achievementProgress(
  id: string,
  stats: CareerStats = loadStats(),
  unlocked = loadAchievements(),
): { current: number; target: number } | null {
  switch (id) {
    case 'veteran':
      return { current: stats.matchesPlayed, target: 10 }
    case 'centurion':
      return { current: stats.matchesPlayed, target: 100 }
    case 'century_hands':
      return { current: stats.handsPlayed, target: 100 }
    case 'hands_500':
      return { current: stats.handsPlayed, target: 500 }
    case 'moon_hunter':
      return { current: stats.moonsShot, target: 3 }
    case 'moon_master':
      return { current: stats.moonsShot, target: 10 }
    case 'streak_3':
      return { current: stats.winStreak, target: 3 }
    case 'streak_5':
      return { current: stats.bestWinStreak, target: 5 }
    case 'streak_10':
      return { current: stats.bestWinStreak, target: 10 }
    case 'wins_25':
      return { current: stats.matchesWon, target: 25 }
    case 'queen_veteran':
      return { current: stats.queensTaken, target: 25 }
    case 'collector':
      return { current: Object.keys(unlocked).length, target: 15 }
    case 'completionist':
      return { current: Object.keys(unlocked).length, target: ACHIEVEMENTS.length }
    default:
      return null
  }
}

export function visibleAchievements(unlocked = loadAchievements()): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !a.secret || unlocked[a.id])
}
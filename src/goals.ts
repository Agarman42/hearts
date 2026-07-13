/** Rotating daily / weekly / monthly goals — gives players something to chase. */

import type { GameId } from './games/registry'
import { goalsKey } from './storageKeys'

export type GoalPeriod = 'daily' | 'weekly' | 'monthly'

export interface GoalDef {
  id: string
  period: GoalPeriod
  title: string
  description: string
  icon: string
  target: number
  /** Stat field or event key to increment */
  metric:
    | 'matches_won'
    | 'hands_played'
    | 'clean_hands'
    | 'moons_shot'
    | 'queen_free_hands'
    | 'hands_under_five'
    | 'matches_played'
}

export interface GoalProgress {
  id: string
  current: number
  completed: boolean
  claimedAt: number | null
}

export interface GoalsState {
  periodKeys: Record<GoalPeriod, string>
  active: GoalDef[]
  progress: Record<string, GoalProgress>
}

function periodKey(period: GoalPeriod, now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  if (period === 'daily') return `${y}-${m}-${d}`
  if (period === 'weekly') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    return `w${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
  }
  return `${y}-${m}`
}

const GOAL_POOL: GoalDef[] = [
  { id: 'd_win1', period: 'daily', title: 'Daily Victor', description: 'Win 1 match today.', icon: '🏁', target: 1, metric: 'matches_won' },
  { id: 'd_clean1', period: 'daily', title: 'Spotless', description: 'Score 0 on 1 hand today.', icon: '✨', target: 1, metric: 'clean_hands' },
  { id: 'd_hands5', period: 'daily', title: 'Warm Up', description: 'Play 5 hands today.', icon: '🃏', target: 5, metric: 'hands_played' },
  { id: 'd_queen1', period: 'daily', title: 'Queen Slip', description: 'Finish 1 hand without the Q♠ today.', icon: '👑', target: 1, metric: 'queen_free_hands' },
  { id: 'w_win3', period: 'weekly', title: 'Weekly Grinder', description: 'Win 3 matches this week.', icon: '🔥', target: 3, metric: 'matches_won' },
  { id: 'w_moon1', period: 'weekly', title: 'Lunar Week', description: 'Shoot the moon once this week.', icon: '🌙', target: 1, metric: 'moons_shot' },
  { id: 'w_clean5', period: 'weekly', title: 'Clean Streak', description: 'Score 0 on 5 hands this week.', icon: '🧊', target: 5, metric: 'clean_hands' },
  { id: 'w_hands25', period: 'weekly', title: 'Card Counter', description: 'Play 25 hands this week.', icon: '📊', target: 25, metric: 'hands_played' },
  { id: 'm_win10', period: 'monthly', title: 'Table Regular', description: 'Win 10 matches this month.', icon: '🏆', target: 10, metric: 'matches_won' },
  { id: 'm_moon3', period: 'monthly', title: 'Moon Season', description: 'Shoot the moon 3 times this month.', icon: '🚀', target: 3, metric: 'moons_shot' },
  { id: 'm_matches20', period: 'monthly', title: 'Marathon', description: 'Play 20 matches this month.', icon: '💯', target: 20, metric: 'matches_played' },
  { id: 'm_light10', period: 'monthly', title: 'Featherweight', description: 'Score 5 or fewer on 10 hands this month.', icon: '🪶', target: 10, metric: 'hands_under_five' },
]

function pickGoalsForPeriod(period: GoalPeriod, seed: string): GoalDef[] {
  const pool = GOAL_POOL.filter((g) => g.period === period)
  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const count = period === 'daily' ? 2 : period === 'weekly' ? 2 : 2
  const picked: GoalDef[] = []
  for (let i = 0; i < count && i < pool.length; i++) {
    picked.push(pool[(hash + i) % pool.length])
  }
  return picked
}

function buildActiveGoals(now = new Date()): { state: GoalsState; rotated: boolean } {
  const keys = {
    daily: periodKey('daily', now),
    weekly: periodKey('weekly', now),
    monthly: periodKey('monthly', now),
  }
  const active = [
    ...pickGoalsForPeriod('daily', keys.daily),
    ...pickGoalsForPeriod('weekly', keys.weekly),
    ...pickGoalsForPeriod('monthly', keys.monthly),
  ]
  const progress: Record<string, GoalProgress> = {}
  for (const g of active) {
    progress[g.id] = { id: g.id, current: 0, completed: false, claimedAt: null }
  }
  return {
    rotated: true,
    state: { periodKeys: keys, active, progress },
  }
}

export function loadGoals(gameId: GameId = 'hearts'): GoalsState {
  try {
    const key = goalsKey(gameId)
    let raw = localStorage.getItem(key)
    if (!raw) {
      const built = buildActiveGoals()
      saveGoals(built.state, gameId)
      return built.state
    }
    const parsed = JSON.parse(raw) as GoalsState
    const now = new Date()
    const needsRotate =
      parsed.periodKeys?.daily !== periodKey('daily', now) ||
      parsed.periodKeys?.weekly !== periodKey('weekly', now) ||
      parsed.periodKeys?.monthly !== periodKey('monthly', now)
    if (needsRotate) {
      const built = buildActiveGoals(now)
      saveGoals(built.state, gameId)
      return built.state
    }
    return parsed
  } catch {
    const built = buildActiveGoals()
    return built.state
  }
}

export function saveGoals(state: GoalsState, gameId: GameId = 'hearts'): void {
  try {
    localStorage.setItem(goalsKey(gameId), JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export type GoalEvent =
  | { metric: 'matches_won'; amount?: number }
  | { metric: 'matches_played'; amount?: number }
  | { metric: 'hands_played'; amount?: number }
  | { metric: 'clean_hands'; amount?: number }
  | { metric: 'moons_shot'; amount?: number }
  | { metric: 'queen_free_hands'; amount?: number }
  | { metric: 'hands_under_five'; amount?: number }

export function recordGoalEvent(
  event: GoalEvent,
  gameId: GameId = 'hearts',
): GoalsState {
  const state = loadGoals(gameId)
  const amount = event.amount ?? 1
  for (const goal of state.active) {
    if (goal.metric !== event.metric) continue
    const p = state.progress[goal.id]
    if (!p || p.completed) continue
    p.current = Math.min(goal.target, p.current + amount)
    if (p.current >= goal.target) {
      p.completed = true
      p.claimedAt = Date.now()
    }
  }
  saveGoals(state, gameId)
  return state
}

export function goalsCompletedCount(state: GoalsState): number {
  return Object.values(state.progress).filter((p) => p.completed).length
}
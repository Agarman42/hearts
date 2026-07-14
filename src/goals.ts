/** Rotating daily / weekly / monthly goals — gives players something to chase. */

import type { GameId } from './games/registry'
import { goalsKey } from './storageKeys'

export type GoalPeriod = 'daily' | 'weekly' | 'monthly'

export type GoalGameId = 'hearts' | 'spades' | 'euchre'

export interface GoalDef {
  id: string
  gameId: GoalGameId
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
    | 'team_bid_made'
    | 'nil_made'
    | 'blind_nil_made'
    | 'euchres_made'
    | 'marches_made'
    | 'loners_made'
    | 'orders_made'
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

const HEARTS_GOAL_POOL: GoalDef[] = [
  { id: 'd_win1', gameId: 'hearts', period: 'daily', title: 'Daily Victor', description: 'Win 1 match today.', icon: '🏁', target: 1, metric: 'matches_won' },
  { id: 'd_clean1', gameId: 'hearts', period: 'daily', title: 'Spotless', description: 'Score 0 on 1 hand today.', icon: '✨', target: 1, metric: 'clean_hands' },
  { id: 'd_hands5', gameId: 'hearts', period: 'daily', title: 'Warm Up', description: 'Play 5 hands today.', icon: '🃏', target: 5, metric: 'hands_played' },
  { id: 'd_queen1', gameId: 'hearts', period: 'daily', title: 'Queen Slip', description: 'Finish 1 hand without the Q♠ today.', icon: '👑', target: 1, metric: 'queen_free_hands' },
  { id: 'w_win3', gameId: 'hearts', period: 'weekly', title: 'Weekly Grinder', description: 'Win 3 matches this week.', icon: '🔥', target: 3, metric: 'matches_won' },
  { id: 'w_moon1', gameId: 'hearts', period: 'weekly', title: 'Lunar Week', description: 'Shoot the moon once this week.', icon: '🌙', target: 1, metric: 'moons_shot' },
  { id: 'w_clean5', gameId: 'hearts', period: 'weekly', title: 'Clean Streak', description: 'Score 0 on 5 hands this week.', icon: '🧊', target: 5, metric: 'clean_hands' },
  { id: 'w_hands25', gameId: 'hearts', period: 'weekly', title: 'Card Counter', description: 'Play 25 hands this week.', icon: '📊', target: 25, metric: 'hands_played' },
  { id: 'm_win10', gameId: 'hearts', period: 'monthly', title: 'Table Regular', description: 'Win 10 matches this month.', icon: '🏆', target: 10, metric: 'matches_won' },
  { id: 'm_moon3', gameId: 'hearts', period: 'monthly', title: 'Moon Season', description: 'Shoot the moon 3 times this month.', icon: '🚀', target: 3, metric: 'moons_shot' },
  { id: 'm_matches20', gameId: 'hearts', period: 'monthly', title: 'Marathon', description: 'Play 20 matches this month.', icon: '💯', target: 20, metric: 'matches_played' },
  { id: 'm_light10', gameId: 'hearts', period: 'monthly', title: 'Featherweight', description: 'Score 5 or fewer on 10 hands this month.', icon: '🪶', target: 10, metric: 'hands_under_five' },
]

const SPADES_GOAL_POOL: GoalDef[] = [
  { id: 'sp_d_win1', gameId: 'spades', period: 'daily', title: 'Daily Victor', description: 'Win 1 Spades match today.', icon: '🏁', target: 1, metric: 'matches_won' },
  { id: 'sp_d_hands5', gameId: 'spades', period: 'daily', title: 'Warm Up', description: 'Play 5 Spades hands today.', icon: '🃏', target: 5, metric: 'hands_played' },
  { id: 'sp_d_bid1', gameId: 'spades', period: 'daily', title: 'Contract', description: 'Make your team bid once today.', icon: '🤝', target: 1, metric: 'team_bid_made' },
  { id: 'sp_d_nil1', gameId: 'spades', period: 'daily', title: 'Nil Hero', description: 'Make a successful nil today.', icon: '🎯', target: 1, metric: 'nil_made' },
  { id: 'sp_w_win3', gameId: 'spades', period: 'weekly', title: 'Weekly Grinder', description: 'Win 3 Spades matches this week.', icon: '🔥', target: 3, metric: 'matches_won' },
  { id: 'sp_w_hands25', gameId: 'spades', period: 'weekly', title: 'Card Counter', description: 'Play 25 Spades hands this week.', icon: '📊', target: 25, metric: 'hands_played' },
  { id: 'sp_w_bid5', gameId: 'spades', period: 'weekly', title: 'Bid Makers', description: 'Make your team bid 5 times this week.', icon: '✅', target: 5, metric: 'team_bid_made' },
  { id: 'sp_w_nil2', gameId: 'spades', period: 'weekly', title: 'Nil Week', description: 'Make 2 successful nils this week.', icon: '🙈', target: 2, metric: 'nil_made' },
  { id: 'sp_m_win10', gameId: 'spades', period: 'monthly', title: 'Table Regular', description: 'Win 10 Spades matches this month.', icon: '🏆', target: 10, metric: 'matches_won' },
  { id: 'sp_m_matches20', gameId: 'spades', period: 'monthly', title: 'Marathon', description: 'Play 20 Spades matches this month.', icon: '💯', target: 20, metric: 'matches_played' },
  { id: 'sp_m_bid15', gameId: 'spades', period: 'monthly', title: 'Partner Pro', description: 'Make your team bid 15 times this month.', icon: '♠', target: 15, metric: 'team_bid_made' },
  { id: 'sp_m_blind1', gameId: 'spades', period: 'monthly', title: 'Blind Faith', description: 'Make a successful blind nil this month.', icon: '🙈', target: 1, metric: 'blind_nil_made' },
]

const EUCHRE_GOAL_POOL: GoalDef[] = [
  { id: 'eu_d_win1', gameId: 'euchre', period: 'daily', title: 'Daily Victor', description: 'Win 1 Euchre match today.', icon: '🏁', target: 1, metric: 'matches_won' },
  { id: 'eu_d_hands5', gameId: 'euchre', period: 'daily', title: 'Warm Up', description: 'Play 5 Euchre hands today.', icon: '🃏', target: 5, metric: 'hands_played' },
  { id: 'eu_d_order1', gameId: 'euchre', period: 'daily', title: 'Caller', description: 'Order trump and make your point today.', icon: '♦', target: 1, metric: 'orders_made' },
  { id: 'eu_d_euchre1', gameId: 'euchre', period: 'daily', title: 'Gotcha', description: 'Euchre the makers once today.', icon: '🎯', target: 1, metric: 'euchres_made' },
  { id: 'eu_w_win3', gameId: 'euchre', period: 'weekly', title: 'Weekly Grinder', description: 'Win 3 Euchre matches this week.', icon: '🔥', target: 3, metric: 'matches_won' },
  { id: 'eu_w_hands25', gameId: 'euchre', period: 'weekly', title: 'Card Counter', description: 'Play 25 Euchre hands this week.', icon: '📊', target: 25, metric: 'hands_played' },
  { id: 'eu_w_march1', gameId: 'euchre', period: 'weekly', title: 'March Week', description: 'March once as makers this week.', icon: '5️⃣', target: 1, metric: 'marches_made' },
  { id: 'eu_w_euchre3', gameId: 'euchre', period: 'weekly', title: 'Defender', description: 'Euchre makers 3 times this week.', icon: '✗', target: 3, metric: 'euchres_made' },
  { id: 'eu_m_win10', gameId: 'euchre', period: 'monthly', title: 'Table Regular', description: 'Win 10 Euchre matches this month.', icon: '🏆', target: 10, metric: 'matches_won' },
  { id: 'eu_m_matches20', gameId: 'euchre', period: 'monthly', title: 'Marathon', description: 'Play 20 Euchre matches this month.', icon: '💯', target: 20, metric: 'matches_played' },
  { id: 'eu_m_order15', gameId: 'euchre', period: 'monthly', title: 'Trump Boss', description: 'Make 15 successful orders this month.', icon: '♦', target: 15, metric: 'orders_made' },
  { id: 'eu_m_loner1', gameId: 'euchre', period: 'monthly', title: 'Lone Wolf', description: 'Loner march once this month.', icon: '🐺', target: 1, metric: 'loners_made' },
]

function goalPoolFor(gameId: GoalGameId): GoalDef[] {
  if (gameId === 'spades') return SPADES_GOAL_POOL
  if (gameId === 'euchre') return EUCHRE_GOAL_POOL
  return HEARTS_GOAL_POOL
}

function resolveGoalGame(gameId: GameId): GoalGameId {
  if (gameId === 'spades') return 'spades'
  if (gameId === 'euchre') return 'euchre'
  return 'hearts'
}

function pickGoalsForPeriod(period: GoalPeriod, seed: string, gameId: GoalGameId): GoalDef[] {
  const pool = goalPoolFor(gameId).filter((g) => g.period === period)
  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const count = period === 'daily' ? 2 : period === 'weekly' ? 2 : 2
  const picked: GoalDef[] = []
  for (let i = 0; i < count && i < pool.length; i++) {
    picked.push(pool[(hash + i) % pool.length])
  }
  return picked
}

function buildActiveGoals(gameId: GoalGameId, now = new Date()): { state: GoalsState; rotated: boolean } {
  const keys = {
    daily: periodKey('daily', now),
    weekly: periodKey('weekly', now),
    monthly: periodKey('monthly', now),
  }
  const active = [
    ...pickGoalsForPeriod('daily', keys.daily, gameId),
    ...pickGoalsForPeriod('weekly', keys.weekly, gameId),
    ...pickGoalsForPeriod('monthly', keys.monthly, gameId),
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
  const goalGame = resolveGoalGame(gameId)
  try {
    const key = goalsKey(gameId)
    let raw = localStorage.getItem(key)
    if (!raw) {
      const built = buildActiveGoals(goalGame)
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
      const built = buildActiveGoals(goalGame, now)
      saveGoals(built.state, gameId)
      return built.state
    }
    return parsed
  } catch {
    const built = buildActiveGoals(goalGame)
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
  | { metric: 'team_bid_made'; amount?: number }
  | { metric: 'nil_made'; amount?: number }
  | { metric: 'blind_nil_made'; amount?: number }
  | { metric: 'euchres_made'; amount?: number }
  | { metric: 'marches_made'; amount?: number }
  | { metric: 'loners_made'; amount?: number }
  | { metric: 'orders_made'; amount?: number }

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
      bumpLifetimeGoalsCompleted()
    }
  }
  saveGoals(state, gameId)
  return state
}

export function goalsCompletedCount(state: GoalsState): number {
  return Object.values(state.progress).filter((p) => p.completed).length
}

/** Completed goals across Hearts and Spades (for home rail). */
export function goalsCompletedAllGames(): number {
  return (
    goalsCompletedCount(loadGoals('hearts')) +
    goalsCompletedCount(loadGoals('spades')) +
    goalsCompletedCount(loadGoals('euchre'))
  )
}

const LIFETIME_KEY = 'cardtable.goals.lifetime.v1'

export function loadLifetimeGoalsCompleted(): number {
  try {
    const raw = localStorage.getItem(LIFETIME_KEY)
    if (!raw) return 0
    const n = Number(JSON.parse(raw))
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

function bumpLifetimeGoalsCompleted(amount = 1): number {
  const next = loadLifetimeGoalsCompleted() + amount
  try {
    localStorage.setItem(LIFETIME_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

function isToday(ts: number, now = new Date()): boolean {
  const d = new Date(ts)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export interface DailyGoalChip {
  gameId: GoalGameId
  title: string
  icon: string
  current: number
  target: number
}

/** One incomplete daily goal per game for the Home rail. */
export function dailyGoalChips(): DailyGoalChip[] {
  const out: DailyGoalChip[] = []
  for (const gameId of ['hearts', 'spades', 'euchre'] as const) {
    const state = loadGoals(gameId)
    const daily = state.active.find((g) => g.period === 'daily')
    if (!daily) continue
    const p = state.progress[daily.id]
    if (!p || p.completed) continue
    out.push({
      gameId,
      title: daily.title,
      icon: daily.icon,
      current: p.current,
      target: daily.target,
    })
  }
  return out
}

/** Goals completed today across all games (for Trophy Case night_owl). */
export function goalsCompletedToday(): number {
  let count = 0
  for (const gameId of ['hearts', 'spades', 'euchre'] as const) {
    const state = loadGoals(gameId)
    for (const p of Object.values(state.progress)) {
      if (p.completed && p.claimedAt && isToday(p.claimedAt)) count += 1
    }
  }
  return count
}
export type AlarmBudget = { count: number; burst: number; lastAt: number }

const BURST_GAP_MS = 200

/** True when this room has alarmed too often or too tightly. */
export function noteAlarm(
  prev: AlarmBudget | undefined,
  now: number,
): { budget: AlarmBudget; tripped: boolean } {
  const count = (prev?.count ?? 0) + 1
  const close = prev != null && now >= prev.lastAt && now - prev.lastAt < BURST_GAP_MS
  const burst = close ? prev.burst + 1 : 0
  const budget = { count, burst, lastAt: now }
  const tripped = count > 300 || burst > 50
  return { budget, tripped }
}

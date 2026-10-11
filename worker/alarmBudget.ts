export type AlarmBudget = {
  /** Alarm times that still fall inside the one-minute window. */
  recent: number[]
  burst: number
  lastAt: number
}

/**
 * Alarms are never scheduled closer than 250 ms, so a tighter gap can never trip.
 * A bot Hearts table runs about 180 alarms a minute (four 260 ms plays, then a 640 ms
 * trick). 190 leaves that room up. A 250 ms loop still dies on the burst check.
 */
export const ALARM_BURST_GAP_MS = 300
export const ALARM_MAX_PER_MINUTE = 190
export const ALARM_MAX_BURST = 50
const WINDOW_MS = 60_000

/** True when this room has alarmed too often in the last minute, or too tightly. */
export function noteAlarm(
  prev: AlarmBudget | undefined,
  now: number,
): { budget: AlarmBudget; tripped: boolean } {
  const recent = (prev?.recent ?? []).filter((t) => now >= t && now - t < WINDOW_MS)
  recent.push(now)
  const gap = prev != null ? now - prev.lastAt : Number.POSITIVE_INFINITY
  const close = prev != null && gap >= 0 && gap < ALARM_BURST_GAP_MS
  const burst = close ? prev.burst + 1 : 0
  const budget = { recent, burst, lastAt: now }
  const tripped = recent.length > ALARM_MAX_PER_MINUTE || burst > ALARM_MAX_BURST
  return { budget, tripped }
}

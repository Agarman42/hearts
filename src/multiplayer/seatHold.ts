/**
 * How long a dropped phone keeps its chair.
 * Five minutes covers a lock screen. The extra seconds let a hello that
 * arrives at exactly five minutes still win the seat.
 */
export const SEAT_HOLD_MS = 5 * 60_000 + 15_000

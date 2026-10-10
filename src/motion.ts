import type { GameSpeed } from './prefs'

/** One card's deal-in. The last card's delay is added on top. */
export const DEAL_FAN_MS = 180
export const DEAL_STAGGER_MS = 8
export const DEAL_CARD_COUNT = 13

/** Seats and the deck flash finish with the last card. */
export const DEAL_SEAT_MS = 180
export const DEAL_DECK_MS = 260

/** Trick cards sweep to the winner. Four cards, short stagger. */
export const TRICK_SWEEP_MS = 220
export const TRICK_SWEEP_STAGGER_MS = 16

/** No throw, sweep, or deal-in runs longer than this. */
export const MOTION_CAP_MS = 300

/** East seat starts last, so the class stays up until that seat lands. */
export const DEAL_SEAT_LAST_DELAY_MS = 120

/** How long the dealing class stays on. Instant and reduced motion skip it. */
export function dealIntroMs(speed: GameSpeed): number {
  if (speed === 'instant') return 0
  const fanEnd = DEAL_FAN_MS + DEAL_STAGGER_MS * (DEAL_CARD_COUNT - 1)
  const seatEnd = DEAL_SEAT_MS + DEAL_SEAT_LAST_DELAY_MS
  return Math.max(fanEnd, seatEnd, DEAL_DECK_MS)
}

export function trickSweepEndMs(): number {
  return TRICK_SWEEP_MS + TRICK_SWEEP_STAGGER_MS * 3
}

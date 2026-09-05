/** Shared multiplayer turn / animation pacing — keep play snappy on phones. */

export const MP_AI_DELAY_MS = 260
export const MP_TRICK_REVEAL_MS = 640
export const MP_HAND_RECAP_MS = 1000
export const MP_BID_ACK_MS = 380
export const MP_FLIGHT_MS_CAP = 200

export function onlineFlightMs(paceFlightMs: number): number {
  return Math.min(paceFlightMs, MP_FLIGHT_MS_CAP)
}

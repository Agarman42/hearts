/** How long a sent card stays locked if the table never answers. */
export const PLAY_LOCK_MS = 1200

/** One online card at a time. A second tap waits until that card is resolved. */
export function claimPlayLock(
  held: string | null,
  cardId: string,
): { held: string; claimed: boolean } {
  if (held) return { held, claimed: false }
  return { held: cardId, claimed: true }
}

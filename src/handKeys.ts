export type HandMoveKey = 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

/** Next card when moving through the hand from left to right. */
export function nextHandCardId(
  ids: readonly string[],
  currentId: string | null,
  key: HandMoveKey,
): string | null {
  if (ids.length === 0) return null
  if (key === 'Home') return ids[0] ?? null
  if (key === 'End') return ids[ids.length - 1] ?? null
  const index = currentId == null ? -1 : ids.indexOf(currentId)
  if (index === -1) return key === 'ArrowLeft' ? (ids[ids.length - 1] ?? null) : (ids[0] ?? null)
  if (key === 'ArrowRight') return ids[(index + 1) % ids.length] ?? null
  return ids[(index - 1 + ids.length) % ids.length] ?? null
}

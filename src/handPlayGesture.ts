/** How far the pointer can move and still count as tap-to-play. */
export const HAND_TAP_SLOP_PX = 14

export interface PlayGestureInput {
  startX: number
  startY: number
  releaseX: number
  releaseY: number
  playLineY: number
  leftHandLayout?: boolean
}

/** True when releasing should play the card (tap, flick up, or left-hand flick right). */
export function shouldCommitPlay(input: PlayGestureInput): boolean {
  const dx = input.releaseX - input.startX
  const dy = input.releaseY - input.startY
  const dist = Math.hypot(dx, dy)
  const up = -dy

  if (dist <= HAND_TAP_SLOP_PX) return true

  const aboveLine = input.releaseY < input.playLineY
  const draggedUp = up >= 28 && up >= dist * 0.55
  const draggedRight =
    Boolean(input.leftHandLayout) && dx >= 28 && dx >= dist * 0.55
  return aboveLine || draggedUp || draggedRight
}

export function playGestureDistance(
  startX: number,
  startY: number,
  x: number,
  y: number,
): number {
  return Math.hypot(x - startX, y - startY)
}
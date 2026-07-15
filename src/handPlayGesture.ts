/** How far the pointer can move and still count as tap-to-play. */
export const HAND_TAP_SLOP_PX = 14

export interface PlayGestureInput {
  startX: number
  startY: number
  releaseX: number
  releaseY: number
  /** Client Y at the top of the player info box — drags must release above this. */
  playLineY: number
  leftHandLayout?: boolean
}

/** Top edge (client Y) of the south player box, if present above the hand. */
export function resolvePlayerBoxPlayLineY(handEl: HTMLElement | null): number {
  if (!handEl) return window.innerHeight * 0.55

  const screen = handEl.closest('.table-screen')
  const playerBox = screen?.querySelector(
    '.table-grid__south .status-bar, .table-grid__south .spades-hud',
  ) as HTMLElement | null

  if (playerBox) {
    return playerBox.getBoundingClientRect().top
  }

  const tableHand = handEl.closest('.table-hand')
  if (tableHand) {
    return tableHand.getBoundingClientRect().top
  }

  return handEl.getBoundingClientRect().top
}

/** True when releasing should play: tap, or drag released above the player box. */
export function shouldCommitPlay(input: PlayGestureInput): boolean {
  const dist = Math.hypot(
    input.releaseX - input.startX,
    input.releaseY - input.startY,
  )

  if (dist <= HAND_TAP_SLOP_PX) return true

  return input.releaseY < input.playLineY
}

export function playGestureDistance(
  startX: number,
  startY: number,
  x: number,
  y: number,
): number {
  return Math.hypot(x - startX, y - startY)
}
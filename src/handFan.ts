export type HandFanSize = 'small' | 'medium' | 'large'

export type HandFanLayout = {
  cardW: number
  step: number
  cardH: number
  fanWidth: number
}

/** How much of the next card stays visible. Large faces overlap more. */
const PEEK_BIAS: Record<HandFanSize, number> = {
  small: 1.28,
  medium: 1,
  large: 0.78,
}

const SIZE_CAP: Record<HandFanSize, number> = {
  small: 100,
  medium: 118,
  large: 140,
}

const SIZE_FLOOR: Record<HandFanSize, number> = {
  small: 66,
  medium: 78,
  large: 86,
}

/** Same tilt the hand uses when it rotates the end cards. */
export function handFanTiltRad(count: number): number {
  const n = Math.max(count, 1)
  return (Math.min(12, 5 + n * 0.45) * Math.PI) / 180
}

/**
 * Fit a fanned hand inside the rail. End cards rotate around their bottom
 * edge, so a full Hearts hand reserves that overhang or the rightmost index
 * slides off a 360px phone.
 */
export function layoutHandFan(
  railWidth: number,
  count: number,
  passMode: boolean,
  size: HandFanSize = 'medium',
): HandFanLayout {
  const n = Math.max(count, 0)
  if (n === 0) return { cardW: 0, step: 0, cardH: 0, fanWidth: 0 }

  const edgeSlack = 8
  const rotPad = n >= 10 ? Math.ceil(Math.sin(handFanTiltRad(n)) * 140) : 0
  const avail = Math.max(0, railWidth - edgeSlack * 2 - rotPad * 2)
  const empty = Math.max(0, 13 - n)
  const bias = PEEK_BIAS[size]
  const basePeek = (passMode ? 0.3 : 0.28) * bias
  const peekCap = (passMode ? 0.55 : 0.52) * Math.max(bias, 1)
  const peekRatio = Math.min(peekCap, basePeek + empty * 0.028 * bias)
  const sizeScale = size === 'large' ? 1.16 : size === 'small' ? 0.9 : 1
  const sizeCap = Math.min(SIZE_CAP[size], (88 + empty * 2.8) * sizeScale)
  const sizeFloor = SIZE_FLOOR[size]
  const denom = 1 + peekRatio * Math.max(0, n - 1)
  let cardW = Math.min(sizeCap, Math.max(sizeFloor, avail / Math.max(denom, 1)))
  let step = cardW

  if (n > 1) {
    step = cardW * peekRatio
    const span = cardW + step * (n - 1)
    if (span < avail - 4) {
      step = Math.min(cardW * 0.78, (avail - cardW) / (n - 1))
    } else if (span > avail) {
      step = Math.max(22, (avail - cardW) / (n - 1))
      const need = cardW + step * (n - 1)
      if (need > avail) {
        cardW = Math.max(sizeFloor - 6, avail - step * (n - 1))
        step = Math.max(20, (avail - cardW) / Math.max(1, n - 1))
      }
    }
    const fitted = cardW + step * (n - 1)
    if (fitted > avail && avail > 0) {
      const scale = avail / fitted
      cardW *= scale
      step *= scale
    }
  }

  cardW = Math.round(cardW * 10) / 10
  step = Math.round(step * 10) / 10
  let cardH = Math.round(cardW * 1.42)
  let fanWidth = n === 1 ? cardW : cardW + (n - 1) * step
  // End cards rotate around their bottom edge. A short hand has no pad of
  // its own, so scale the whole fan until the tilted corners fit the rail.
  if (n > 1 && railWidth > 0) {
    const overhang = Math.sin(handFanTiltRad(n)) * cardH
    const visual = fanWidth + overhang * 2
    const limit = Math.max(0, railWidth - 4)
    if (visual > limit) {
      const scale = limit / visual
      cardW = Math.round(cardW * scale * 10) / 10
      step = Math.round(step * scale * 10) / 10
      cardH = Math.round(cardW * 1.42)
      fanWidth = n === 1 ? cardW : cardW + (n - 1) * step
    }
  }
  return { cardW, step, cardH, fanWidth }
}

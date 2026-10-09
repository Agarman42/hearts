export type HandFanLayout = {
  cardW: number
  step: number
  cardH: number
  fanWidth: number
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
): HandFanLayout {
  const n = Math.max(count, 0)
  if (n === 0) return { cardW: 0, step: 0, cardH: 0, fanWidth: 0 }

  const edgeSlack = 8
  const rotPad = n >= 10 ? Math.ceil(Math.sin(handFanTiltRad(n)) * 140) : 0
  const avail = Math.max(0, railWidth - edgeSlack * 2 - rotPad * 2)
  const empty = Math.max(0, 13 - n)
  const basePeek = passMode ? 0.3 : 0.28
  const peekRatio = Math.min(passMode ? 0.55 : 0.52, basePeek + empty * 0.028)
  const sizeCap = Math.min(118, 88 + empty * 2.8)
  const sizeFloor = 78
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
  const cardH = Math.round(cardW * 1.42)
  const fanWidth = n === 1 ? cardW : cardW + (n - 1) * step
  return { cardW, step, cardH, fanWidth }
}

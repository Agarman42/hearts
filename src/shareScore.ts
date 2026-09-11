/** Build a shareable plain-text score card for match or hand end. */

export function buildShareText(opts: {
  game: string
  title: string
  lines: string[]
}): string {
  return [`Card Parlour · ${opts.game}`, opts.title, ...opts.lines, '', 'https://agarman42.github.io/hearts/']
    .filter(Boolean)
    .join('\n')
}

export function heartsHandRecapLines(opts: {
  names: [string, string, string, string]
  handPoints: [number, number, number, number]
  queenSeat: number | null
  moonShooter: number | null
}): string[] {
  const scores = opts.names.map((n, i) => `${n} +${opts.handPoints[i]}`).join(' · ')
  const queen =
    opts.queenSeat != null ? `${opts.names[opts.queenSeat]} ate Q♠` : 'Q♠ not taken'
  const moon =
    opts.moonShooter != null ? `${opts.names[opts.moonShooter]} shot the moon` : 'No moon'
  return [scores, queen, moon, 'Card Parlour kitchen table']
}

export function spadesHandRecapLines(opts: {
  nsBid: number
  nsMade: number
  ewBid: number
  ewMade: number
  nsBags: number
  ewBags: number
  nilLine: string
}): string[] {
  return [
    `NS ${opts.nsMade}/${opts.nsBid}`,
    `EW ${opts.ewMade}/${opts.ewBid}`,
    `Bags NS ${opts.nsBags} · EW ${opts.ewBags}`,
    opts.nilLine,
  ]
}

export function euchreHandRecapLines(opts: {
  makers: string
  makerTricks: number
  euchred: boolean
  marched: boolean
  loner: boolean
}): string[] {
  const result = opts.euchred
    ? 'Euchre'
    : opts.marched
      ? opts.loner
        ? 'Loner march'
        : 'March'
      : 'Point'
  return [
    `${opts.makers} ${opts.makerTricks}/5`,
    `Defenders ${5 - opts.makerTricks}/5`,
    result,
    opts.loner ? 'Loner' : 'With partner',
  ]
}

export async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text, title: 'Card Parlour' })
      return 'shared'
    }
  } catch {
    /* fall through to clipboard */
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
  } catch {
    /* ignore */
  }
  return 'failed'
}

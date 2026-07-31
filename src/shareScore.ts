/** Build a shareable plain-text score card for match end. */

export function buildShareText(opts: {
  game: string
  title: string
  lines: string[]
}): string {
  return [`Card Parlour · ${opts.game}`, opts.title, ...opts.lines, '', 'https://agarman42.github.io/hearts/']
    .filter(Boolean)
    .join('\n')
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

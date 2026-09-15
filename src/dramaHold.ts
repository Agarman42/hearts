import type { GameSpeed } from './prefs'

export type DramaHoldKind = 'negative' | 'celebrate' | 'info'

/** Set / euchre / bag / stuck — must clear before the next bid panel. */
export const NEGATIVE_DRAMA_MS = 1500
/** March / moon — a beat, not a billboard. */
export const CELEBRATE_DRAMA_MS = 2200
export const INSTANT_DRAMA_MS = 1000
/** Order-up / turn callouts / trump recap auto-ack. */
export const INFO_DRAMA_MS = 900
export const INFO_INSTANT_MS = 600

export function dramaHoldMs(
  kind: DramaHoldKind,
  opts: {
    gameSpeed?: GameSpeed
    skipRecaps?: boolean
    reduceMotion?: boolean
  } = {},
): number {
  if (opts.skipRecaps || opts.reduceMotion) return 0
  if (kind === 'info') {
    return opts.gameSpeed === 'instant' ? INFO_INSTANT_MS : INFO_DRAMA_MS
  }
  if (opts.gameSpeed === 'instant') return INSTANT_DRAMA_MS
  if (kind === 'negative') return NEGATIVE_DRAMA_MS
  if (kind === 'celebrate') return CELEBRATE_DRAMA_MS
  return INFO_DRAMA_MS
}

export function isNegativeDramaKind(kind: string): boolean {
  return kind === 'euchre' || kind === 'set' || kind === 'bag' || kind === 'stick'
}

export function isCelebrateDramaKind(kind: string): boolean {
  return kind === 'march' || kind === 'nil' || kind === 'moon'
}

export function systemReduceMotion(): boolean {
  if (typeof document === 'undefined') return false
  return (
    document.documentElement.getAttribute('data-reduce-motion') === 'true' ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  )
}

export function isHandEndDramaKind(kind: string): boolean {
  return (
    kind === 'euchre' ||
    kind === 'march' ||
    kind === 'set' ||
    kind === 'bag' ||
    kind === 'nil'
  )
}

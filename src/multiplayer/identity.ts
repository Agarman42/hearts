import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import { DEFAULT_NAMES, normalizeSeatName } from '../prefs'
import type { LobbyOccupant, LobbyState } from './protocol'

/**
 * AI fill names for empty chairs. Never "You" — that label is reserved for the
 * local player's seat after screen rotation, not compass seat 0.
 */
export const AI_FILL_NAMES: Record<Seat, string> = {
  0: 'Jules',
  1: 'Angie',
  2: 'Scott',
  3: 'Heather',
}

const EXTRA_FILL = ['Remy', 'Quinn', 'Morgan', 'Reese'] as const

export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function isYouName(name: string): boolean {
  return nameKey(name) === 'you'
}

export function nextUnusedName(preferred: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, nameKey).filter(Boolean))
  const base = normalizeSeatName(preferred, 'Player')
  if (!used.has(nameKey(base))) return base
  const candidates = [base, ...SEATS.map((s) => AI_FILL_NAMES[s]), ...EXTRA_FILL]
  for (const c of candidates) {
    if (!used.has(nameKey(c))) return c
  }
  for (let i = 2; i < 20; i++) {
    const c = `${base.slice(0, 14)} ${i}`.trim().slice(0, 16)
    if (!used.has(nameKey(c))) return c
  }
  return `${base.slice(0, 12)} ${Date.now() % 90}`
}

export function defaultFillName(seat: Seat, takenNames: Iterable<string>): string {
  const preferred = seat === 0 ? AI_FILL_NAMES[0] : DEFAULT_NAMES[seat]
  const safe = isYouName(preferred) ? AI_FILL_NAMES[0] : preferred
  return nextUnusedName(safe, takenNames)
}

/** First occupant keeps the typed name; later collisions become "Scott 2". */
export function disambiguateNames(names: Record<Seat, string>): Record<Seat, string> {
  const seen = new Map<string, number>()
  const out = { ...names }
  for (const seat of SEATS) {
    const raw = normalizeSeatName(names[seat], AI_FILL_NAMES[seat])
    const key = nameKey(raw)
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    out[seat] = n === 1 ? raw : `${raw.slice(0, 14)} ${n}`.trim().slice(0, 16)
  }
  return out
}

export function namesForMatch(
  lobby: Pick<LobbyState, 'chairs'> & { fillNames?: Partial<Record<Seat, string>> },
): Record<Seat, string> {
  const raw = {} as Record<Seat, string>
  const taken: string[] = []
  for (const seat of SEATS) {
    const occ = lobby.chairs[seat]
    if (occ?.name.trim()) {
      raw[seat] = normalizeSeatName(occ.name, AI_FILL_NAMES[seat])
      taken.push(raw[seat])
    }
  }
  for (const seat of SEATS) {
    if (raw[seat]) continue
    const override = lobby.fillNames?.[seat]
    raw[seat] = override?.trim()
      ? nextUnusedName(override, taken)
      : defaultFillName(seat, taken)
    taken.push(raw[seat])
  }
  // Humans keep typed names (duplicates allowed). Only AI fills are uniqued above.
  return raw
}

/** Viewer keeps their typed name; other collisions become "Scott 2". */
export function displayNamesForViewer(
  names: Record<Seat, string>,
  viewerSeat: Seat,
): Record<Seat, string> {
  const mine = names[viewerSeat]
  const key = nameKey(mine)
  const out = { ...names }
  let n = 2
  for (const seat of SEATS) {
    if (seat === viewerSeat) continue
    if (nameKey(names[seat]) === key) {
      out[seat] = `${names[seat].slice(0, 14)} ${n}`.trim().slice(0, 16)
      n += 1
    }
  }
  return out
}

export function previewChairName(
  occupant: LobbyOccupant | null,
  engineSeat: Seat,
  localPlayerId: string | null,
  lobby: Pick<LobbyState, 'chairs'> & { fillNames?: Partial<Record<Seat, string>> },
): { name: string; isYou: boolean; empty: boolean } {
  if (occupant) {
    return {
      name: occupant.name,
      isYou: occupant.playerId === localPlayerId,
      empty: false,
    }
  }
  const taken = SEATS.map((s) => lobby.chairs[s]?.name).filter((n): n is string => Boolean(n))
  const override = lobby.fillNames?.[engineSeat]
  return {
    name: override?.trim() ? override.trim().slice(0, 16) : defaultFillName(engineSeat, taken),
    isYou: false,
    empty: true,
  }
}

export function emptyFillNames(): Partial<Record<Seat, string>> {
  return {}
}

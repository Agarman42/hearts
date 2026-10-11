import { cleanDisplayName } from './displayName'

export const NIGHT_SIZES = [12, 16, 20] as const
export const NIGHT_ROUNDS = 6
const NIGHT_KEY = 'cardparlour.euchreNight.v1'

export interface NightTable {
  /** North, east, south, west. Partners sit across: north-south and east-west. */
  seats: [number, number, number, number]
}

export interface NightRound {
  tables: NightTable[]
}

export interface NightScore {
  ns: number
  ew: number
}

export interface Night {
  names: string[]
  rounds: NightRound[]
  scores: Array<Array<NightScore | null>>
  currentRound: number
  complete: boolean
}

function isNightSize(count: number): boolean {
  return (NIGHT_SIZES as readonly number[]).includes(count)
}

/** Six rounds. Each player sits once a round and never keeps the same partner. */
export function planNight(count: number): NightRound[] {
  if (!isNightSize(count)) {
    throw new Error('An euchre night is 12, 16, or 20 players')
  }
  const fixed = count - 1
  const circle = Array.from({ length: count - 1 }, (_, i) => i)
  const rounds: NightRound[] = []
  for (let round = 0; round < NIGHT_ROUNDS; round++) {
    const spin = round % (count - 1)
    const rotated = circle.slice(spin).concat(circle.slice(0, spin))
    const row = [fixed, ...rotated]
    const pairs: [number, number][] = []
    for (let i = 0; i < count / 2; i++) {
      pairs.push([row[i]!, row[count - 1 - i]!])
    }
    const tables: NightTable[] = []
    const half = pairs.length / 2
    for (let table = 0; table < half; table++) {
      const ns = pairs[table]!
      const ew = pairs[half + ((table + round) % half)]!
      tables.push({ seats: [ns[0], ew[0], ns[1], ew[1]] })
    }
    rounds.push({ tables })
  }
  return rounds
}

function uniqueNightNames(raw: string[]): string[] {
  const used = new Set<string>()
  return raw.map((name, index) => {
    const cleaned = cleanDisplayName(name)
    const base = cleaned === 'Player' ? `Player ${index + 1}` : cleaned
    let candidate = base
    let n = 2
    while (used.has(candidate.toLowerCase())) {
      const suffix = ` ${n}`
      candidate = `${base.slice(0, 16 - suffix.length)}${suffix}`
      n += 1
    }
    used.add(candidate.toLowerCase())
    return candidate
  })
}

export function createNight(rawNames: string[]): Night {
  const names = uniqueNightNames(rawNames)
  const rounds = planNight(names.length)
  return {
    names,
    rounds,
    scores: rounds.map((round) => round.tables.map(() => null)),
    currentRound: 0,
    complete: false,
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(99, Math.round(value)))
}

export function enterScore(night: Night, tableIndex: number, score: NightScore): Night {
  if (night.complete) return night
  const tables = night.rounds[night.currentRound]?.tables
  if (!tables || tableIndex < 0 || tableIndex >= tables.length) return night
  const next = { ns: clampScore(score.ns), ew: clampScore(score.ew) }
  const scores = night.scores.map((round, roundIndex) =>
    roundIndex === night.currentRound
      ? round.map((cell, index) => (index === tableIndex ? next : cell))
      : round,
  )
  return { ...night, scores }
}

export function roundReady(night: Night): boolean {
  const row = night.scores[night.currentRound]
  return !!row && row.every((cell) => cell != null)
}

export function advanceNight(night: Night): Night {
  if (night.complete || !roundReady(night)) return night
  if (night.currentRound >= NIGHT_ROUNDS - 1) return { ...night, complete: true }
  return { ...night, currentRound: night.currentRound + 1 }
}

export function standings(night: Night): { name: string; points: number }[] {
  const points = night.names.map(() => 0)
  night.rounds.forEach((round, roundIndex) => {
    round.tables.forEach((table, tableIndex) => {
      const score = night.scores[roundIndex]?.[tableIndex]
      if (!score) return
      const [north, east, south, west] = table.seats
      points[north] = (points[north] ?? 0) + score.ns
      points[south] = (points[south] ?? 0) + score.ns
      points[east] = (points[east] ?? 0) + score.ew
      points[west] = (points[west] ?? 0) + score.ew
    })
  })
  return night.names
    .map((name, index) => ({ name, points: points[index] ?? 0, index }))
    .sort((a, b) => b.points - a.points || a.index - b.index)
    .map(({ name, points }) => ({ name, points }))
}

export function nightResultsText(night: Night): string {
  const board = standings(night)
  const total = board.reduce((sum, row) => sum + row.points, 0)
  return [
    'Card Parlour · Euchre night',
    `${night.names.length} players · ${NIGHT_ROUNDS} rounds`,
    '',
    ...board.map((row, index) => `${index + 1}. ${row.name} — ${row.points}`),
    '',
    `Points recorded ${total}`,
  ].join('\n')
}

function isNight(value: unknown): value is Night {
  if (!value || typeof value !== 'object') return false
  const night = value as Night
  const size = night.names?.length
  return (
    (size === 12 || size === 16 || size === 20) &&
    Array.isArray(night.rounds) &&
    night.rounds.length === NIGHT_ROUNDS &&
    Array.isArray(night.scores) &&
    typeof night.currentRound === 'number' &&
    typeof night.complete === 'boolean'
  )
}

export function loadNight(): Night | null {
  try {
    const raw = localStorage.getItem(NIGHT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isNight(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function rememberNight(night: Night | null): void {
  try {
    if (!night) localStorage.removeItem(NIGHT_KEY)
    else localStorage.setItem(NIGHT_KEY, JSON.stringify(night))
  } catch {
    /* the board still shows for this visit */
  }
}

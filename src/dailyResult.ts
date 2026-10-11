import type { GameId } from './games/registry'

export interface DailyStreak {
  last: string
  count: number
}

export type DailyStreakBook = Record<GameId, DailyStreak | null>

export function emptyDailyStreaks(): DailyStreakBook {
  return { hearts: null, spades: null, euchre: null }
}

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const next = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  next.setUTCDate(next.getUTCDate() + days)
  const yy = next.getUTCFullYear()
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(next.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function noteDailyPlay(
  book: DailyStreakBook,
  gameId: GameId,
  dateKey: string,
): { book: DailyStreakBook; count: number; already: boolean } {
  const current = book[gameId]
  if (current?.last === dateKey) {
    return { book, count: current.count, already: true }
  }
  if (current && dateKey < current.last) {
    return { book, count: current.count, already: false }
  }
  const count = current && dateKey === shiftDateKey(current.last, 1) ? current.count + 1 : 1
  const next = { ...book, [gameId]: { last: dateKey, count } }
  return { book: next, count, already: false }
}

export function dailyResultText(opts: {
  game: string
  dateKey: string
  yourScore: number
  streak: number
}): string {
  return [
    `Card Parlour · Today's ${opts.game} hand`,
    opts.dateKey,
    `Score ${opts.yourScore}`,
    `Streak ${opts.streak}`,
    '',
    'https://agarman42.github.io/hearts/',
  ].join('\n')
}

export function dailyButtonSubtitle(count: number): string {
  if (count <= 0) return 'Same cards for every player today'
  return `Same cards today · streak ${count}`
}

const STREAK_KEY = 'cardparlour.dailyStreak.v1'
const GAME_IDS: GameId[] = ['hearts', 'spades', 'euchre']

function isStreak(value: unknown): value is DailyStreak {
  if (!value || typeof value !== 'object') return false
  const row = value as DailyStreak
  return typeof row.last === 'string' && typeof row.count === 'number' && row.count > 0
}

export function loadDailyStreaks(): DailyStreakBook {
  const book = emptyDailyStreaks()
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return book
    const parsed = JSON.parse(raw) as Partial<Record<GameId, unknown>>
    for (const id of GAME_IDS) {
      if (isStreak(parsed[id])) book[id] = parsed[id]
    }
    return book
  } catch {
    return emptyDailyStreaks()
  }
}

export function rememberDailyPlay(gameId: GameId, dateKey: string): number {
  const noted = noteDailyPlay(loadDailyStreaks(), gameId, dateKey)
  if (!noted.already) {
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(noted.book))
    } catch {
      /* the streak still shows for this hand */
    }
  }
  return noted.count
}

const GAME_TITLE: Record<GameId, string> = {
  hearts: 'Hearts',
  spades: 'Spades',
  euchre: 'Euchre',
}

/** Score and streak only. Card names would spoil the shared deal. */
export function dailyShareText(gameId: GameId, dateKey: string, yourScore: number): string {
  return dailyResultText({
    game: GAME_TITLE[gameId],
    dateKey,
    yourScore,
    streak: loadDailyStreaks()[gameId]?.count ?? 0,
  })
}

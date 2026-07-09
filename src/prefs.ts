import { AiDifficulty, Seat, SEATS } from './core/types'
import { DEFAULT_HEARTS_RULES, GameRulesConfig } from './games/types'
import { DEFAULT_CHARACTER_IDS } from './characters'

export type GameSpeed = 'instant' | 'fast' | 'normal' | 'slow'

/** Table felt color / pattern. Default is classic casino green. */
export type FeltStyle =
  | 'green'
  | 'blue'
  | 'burgundy'
  | 'black'
  | 'purple'
  | 'teal'
  | 'crimson'
  | 'midnight'
  | 'sand'

export interface SeatPrefs {
  name: string
  difficulty: AiDifficulty
  characterId: string
}

export interface UserPrefs {
  gameSpeed: GameSpeed
  /** After all 26 points are taken, race through remaining tricks. */
  autoFinishHand: boolean
  feltStyle: FeltStyle
  /** Mobile vibration cues */
  hapticsEnabled: boolean
  seats: Record<Seat, SeatPrefs>
  rules: GameRulesConfig
}

const STORAGE_KEY = 'hearts.prefs.v2'

/** West / North / East defaults — editable in Settings. */
export const DEFAULT_NAMES: Record<Seat, string> = {
  0: 'You',
  1: 'Angie',
  2: 'Scott',
  3: 'Heather',
}

/** Old stock AI names → migrate so existing installs pick up the new defaults. */
const LEGACY_STOCK_NAMES: Partial<Record<Seat, string[]>> = {
  1: ['Nova'],
  2: ['Rex'],
  3: ['Ivy'],
}

export const FELT_STYLES: {
  id: FeltStyle
  label: string
  swatch: string
}[] = [
  { id: 'green', label: 'Casino green', swatch: 'linear-gradient(145deg, #1a8f4a, #0a4a28)' },
  { id: 'blue', label: 'Royal blue', swatch: 'linear-gradient(145deg, #2a5a9e, #0e2048)' },
  { id: 'burgundy', label: 'Burgundy', swatch: 'linear-gradient(145deg, #9b2348, #4a1024)' },
  { id: 'purple', label: 'Royal purple', swatch: 'linear-gradient(145deg, #7c3aed, #3b0764)' },
  { id: 'teal', label: 'Teal baize', swatch: 'linear-gradient(145deg, #0d9488, #042f2e)' },
  { id: 'crimson', label: 'Crimson', swatch: 'linear-gradient(145deg, #dc2626, #450a0a)' },
  { id: 'midnight', label: 'Midnight', swatch: 'linear-gradient(145deg, #1e3a5f, #020617)' },
  { id: 'sand', label: 'Desert sand', swatch: 'linear-gradient(145deg, #c4a574, #5c4030)' },
  { id: 'black', label: 'OLED night', swatch: 'linear-gradient(145deg, #1a1a1a, #000000)' },
]

export const DEFAULT_PREFS: UserPrefs = {
  gameSpeed: 'fast',
  autoFinishHand: true,
  feltStyle: 'green',
  hapticsEnabled: true,
  seats: {
    0: {
      name: DEFAULT_NAMES[0],
      difficulty: 'medium',
      characterId: DEFAULT_CHARACTER_IDS[0],
    },
    1: {
      name: DEFAULT_NAMES[1],
      difficulty: 'medium',
      characterId: DEFAULT_CHARACTER_IDS[1],
    },
    2: {
      name: DEFAULT_NAMES[2],
      difficulty: 'medium',
      characterId: DEFAULT_CHARACTER_IDS[2],
    },
    3: {
      name: DEFAULT_NAMES[3],
      difficulty: 'medium',
      characterId: DEFAULT_CHARACTER_IDS[3],
    },
  },
  rules: { ...DEFAULT_HEARTS_RULES },
}

/**
 * Pace timing by speed setting.
 * - aiMs: delay before an AI plays
 * - flightPadMs: extra wait so the previous play flight can finish (UI also queues)
 * - trickRevealMs: total time showing the completed trick (hold + collect)
 * - flightMs: card throw animation length
 * - holdMs: how long all 4 cards sit before scooping
 */
export const SPEED_TIMING: Record<
  GameSpeed,
  {
    aiMs: number
    flightPadMs: number
    trickRevealMs: number
    flightMs: number
    holdMs: number
  }
> = {
  instant: {
    aiMs: 25,
    flightPadMs: 0,
    trickRevealMs: 620,
    flightMs: 180,
    holdMs: 280,
  },
  fast: {
    aiMs: 100,
    flightPadMs: 160,
    trickRevealMs: 900,
    flightMs: 260,
    holdMs: 420,
  },
  normal: {
    aiMs: 320,
    flightPadMs: 280,
    trickRevealMs: 1300,
    flightMs: 340,
    holdMs: 650,
  },
  slow: {
    aiMs: 600,
    flightPadMs: 360,
    trickRevealMs: 1800,
    flightMs: 420,
    holdMs: 900,
  },
}

/** Used when auto-finishing a dead hand (all 26 pts already scored). */
export const AUTO_FINISH_TIMING = {
  aiMs: 20,
  flightPadMs: 0,
  trickRevealMs: 480,
  flightMs: 120,
  holdMs: 200,
}

export const SPEED_LABELS: Record<GameSpeed, string> = {
  instant: 'Instant',
  fast: 'Fast',
  normal: 'Normal',
  slow: 'Slow',
}

function sanitizeSeat(
  seat: Seat,
  raw: Partial<SeatPrefs> | undefined,
): SeatPrefs {
  const def = DEFAULT_PREFS.seats[seat]
  const difficulty =
    raw?.difficulty === 'easy' ||
    raw?.difficulty === 'medium' ||
    raw?.difficulty === 'hard'
      ? raw.difficulty
      : def.difficulty
  let name =
    typeof raw?.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim().slice(0, 16)
      : def.name
  // Migrate stock AI names (Nova/Rex/Ivy → Angie/Scott/Heather)
  const legacy = LEGACY_STOCK_NAMES[seat]
  if (legacy?.includes(name)) {
    name = def.name
  }
  const characterId =
    typeof raw?.characterId === 'string' && raw.characterId
      ? raw.characterId
      : def.characterId
  return { name, difficulty, characterId }
}

function cloneDefaults(): UserPrefs {
  return JSON.parse(JSON.stringify(DEFAULT_PREFS)) as UserPrefs
}

export function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // migrate v1
    if (!raw) {
      const v1 = localStorage.getItem('hearts.prefs.v1')
      if (v1) {
        const old = JSON.parse(v1) as { gameSpeed?: GameSpeed }
        const merged = cloneDefaults()
        if (old.gameSpeed && old.gameSpeed in SPEED_TIMING) {
          merged.gameSpeed = old.gameSpeed
        }
        savePrefs(merged)
        return merged
      }
      return cloneDefaults()
    }
    const parsed = JSON.parse(raw) as Partial<UserPrefs>
    const seats = {} as Record<Seat, SeatPrefs>
    for (const seat of SEATS) {
      seats[seat] = sanitizeSeat(seat, parsed.seats?.[seat])
    }
    const feltOk = FELT_STYLES.some((f) => f.id === parsed.feltStyle)
    return {
      gameSpeed:
        parsed.gameSpeed && parsed.gameSpeed in SPEED_TIMING
          ? parsed.gameSpeed
          : DEFAULT_PREFS.gameSpeed,
      autoFinishHand:
        typeof parsed.autoFinishHand === 'boolean'
          ? parsed.autoFinishHand
          : DEFAULT_PREFS.autoFinishHand,
      feltStyle: feltOk ? (parsed.feltStyle as FeltStyle) : DEFAULT_PREFS.feltStyle,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean'
          ? parsed.hapticsEnabled
          : DEFAULT_PREFS.hapticsEnabled,
      seats,
      rules: {
        ...DEFAULT_HEARTS_RULES,
        ...(parsed.rules ?? {}),
      },
    }
  } catch {
    return cloneDefaults()
  }
}

export function savePrefs(prefs: UserPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota */
  }
}

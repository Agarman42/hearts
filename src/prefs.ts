import { AiDifficulty, Seat, SEATS } from './core/types'
import { DEFAULT_HUMAN_SEATS, type HumanSeatsConfig } from './passAndPlay'
import type { AvailableGameId } from './games/registry'
import { DEFAULT_HEARTS_RULES, type HeartsRulesConfig } from './games/hearts/types'
import { DEFAULT_SPADES_RULES, type SpadesRulesConfig } from './games/spades/types'
import { DEFAULT_EUCHRE_RULES, type EuchreRulesConfig } from './games/euchre/types'
import { DEFAULT_CHARACTER_IDS } from './characters'
import { LEGACY_KEYS, prefsKey } from './storageKeys'

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

/** Face-down card back style (CSS themes + classic photo). */
/** Hand / trick card scale on the table. */
export type CardSize = 'small' | 'medium' | 'large'

/** Primary Deal button on the home screen. */
export type DefaultDealGame = AvailableGameId | 'lastPlayed'

export type CardBackStyle =
  | 'classic'
  | 'gold'
  | 'rose'
  | 'navy'
  | 'emerald'
  | 'midnight'

export interface SeatPrefs {
  name: string
  difficulty: AiDifficulty
  characterId: string
}

export interface UserPrefs {
  activeGameId: AvailableGameId
  /** Home Deal button target — lastPlayed uses activeGameId. */
  defaultDealGame: DefaultDealGame
  gameSpeed: GameSpeed
  /** After all 26 points are taken, race through remaining tricks. */
  autoFinishHand: boolean
  feltStyle: FeltStyle
  cardBack: CardBackStyle
  /** Mobile vibration cues */
  hapticsEnabled: boolean
  /** Synthesized table sounds (card play, tricks, unlocks) */
  soundEnabled: boolean
  /** Sound loudness 0–100 when sound is enabled. */
  soundVolume: number
  /** Wins / trophies / goals strip on the home screen. */
  showCareerBar: boolean
  /** Silly banter in status toasts / messages */
  humorMode: boolean
  /** First-play coach tip dialogs per game. */
  coachTipsEnabled: boolean
  /** Shorten animations (also respects system reduce-motion). */
  reduceMotion: boolean
  cardSize: CardSize
  /** Multiple humans on one device — pass between seats */
  passAndPlay: boolean
  humanSeats: HumanSeatsConfig
  seats: Record<Seat, SeatPrefs>
  rules: HeartsRulesConfig
  spadesRules: SpadesRulesConfig
  euchreRules: EuchreRulesConfig
}

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

export const CARD_BACKS: {
  id: CardBackStyle
  label: string
  swatch: string
}[] = [
  {
    id: 'classic',
    label: 'Classic damask',
    swatch: 'linear-gradient(145deg, #1a3a6e, #0c1a38)',
  },
  {
    id: 'gold',
    label: 'Royal gold',
    swatch: 'linear-gradient(145deg, #c9a227, #5c3d0a)',
  },
  {
    id: 'rose',
    label: 'Velvet rose',
    swatch: 'linear-gradient(145deg, #be123c, #4c0519)',
  },
  {
    id: 'navy',
    label: 'Deep navy',
    swatch: 'linear-gradient(145deg, #1e3a8a, #0f172a)',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    swatch: 'linear-gradient(145deg, #059669, #064e3b)',
  },
  {
    id: 'midnight',
    label: 'Midnight ink',
    swatch: 'linear-gradient(145deg, #312e81, #0c0a1a)',
  },
]

export const CARD_SIZES: { id: CardSize; label: string }[] = [
  { id: 'small', label: 'Compact' },
  { id: 'medium', label: 'Standard' },
  { id: 'large', label: 'Large' },
]

export const DEFAULT_DEAL_OPTIONS: { id: DefaultDealGame; label: string }[] = [
  { id: 'lastPlayed', label: 'Last played' },
  { id: 'hearts', label: 'Hearts' },
  { id: 'spades', label: 'Spades' },
  { id: 'euchre', label: 'Euchre' },
]

export const DEFAULT_PREFS: UserPrefs = {
  activeGameId: 'hearts',
  defaultDealGame: 'lastPlayed',
  gameSpeed: 'fast',
  autoFinishHand: true,
  feltStyle: 'green',
  cardBack: 'classic',
  hapticsEnabled: true,
  soundEnabled: false,
  soundVolume: 80,
  showCareerBar: true,
  humorMode: false,
  coachTipsEnabled: true,
  reduceMotion: false,
  cardSize: 'medium',
  passAndPlay: false,
  humanSeats: { ...DEFAULT_HUMAN_SEATS },
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
  spadesRules: { ...DEFAULT_SPADES_RULES },
  euchreRules: { ...DEFAULT_EUCHRE_RULES },
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
    aiMs: 120,
    flightPadMs: 200,
    trickRevealMs: 1100,
    flightMs: 280,
    holdMs: 480,
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
    const key = prefsKey('hearts')
    let raw = localStorage.getItem(key)
    if (!raw) raw = localStorage.getItem(LEGACY_KEYS.prefs)
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
    const backOk = CARD_BACKS.some((b) => b.id === parsed.cardBack)
    return {
      activeGameId:
        parsed.activeGameId === 'hearts' ||
        parsed.activeGameId === 'spades' ||
        parsed.activeGameId === 'euchre'
          ? parsed.activeGameId
          : DEFAULT_PREFS.activeGameId,
      defaultDealGame:
        parsed.defaultDealGame === 'lastPlayed' ||
        parsed.defaultDealGame === 'hearts' ||
        parsed.defaultDealGame === 'spades' ||
        parsed.defaultDealGame === 'euchre'
          ? parsed.defaultDealGame
          : DEFAULT_PREFS.defaultDealGame,
      gameSpeed:
        parsed.gameSpeed && parsed.gameSpeed in SPEED_TIMING
          ? parsed.gameSpeed
          : DEFAULT_PREFS.gameSpeed,
      autoFinishHand:
        typeof parsed.autoFinishHand === 'boolean'
          ? parsed.autoFinishHand
          : DEFAULT_PREFS.autoFinishHand,
      feltStyle: feltOk ? (parsed.feltStyle as FeltStyle) : DEFAULT_PREFS.feltStyle,
      cardBack: backOk ? (parsed.cardBack as CardBackStyle) : DEFAULT_PREFS.cardBack,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean'
          ? parsed.hapticsEnabled
          : DEFAULT_PREFS.hapticsEnabled,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_PREFS.soundEnabled,
      soundVolume:
        typeof parsed.soundVolume === 'number' &&
        parsed.soundVolume >= 0 &&
        parsed.soundVolume <= 100
          ? Math.round(parsed.soundVolume)
          : DEFAULT_PREFS.soundVolume,
      showCareerBar:
        typeof parsed.showCareerBar === 'boolean'
          ? parsed.showCareerBar
          : DEFAULT_PREFS.showCareerBar,
      humorMode:
        typeof parsed.humorMode === 'boolean'
          ? parsed.humorMode
          : DEFAULT_PREFS.humorMode,
      coachTipsEnabled:
        typeof parsed.coachTipsEnabled === 'boolean'
          ? parsed.coachTipsEnabled
          : DEFAULT_PREFS.coachTipsEnabled,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_PREFS.reduceMotion,
      cardSize:
        parsed.cardSize === 'small' ||
        parsed.cardSize === 'medium' ||
        parsed.cardSize === 'large'
          ? parsed.cardSize
          : DEFAULT_PREFS.cardSize,
      passAndPlay:
        typeof parsed.passAndPlay === 'boolean'
          ? parsed.passAndPlay
          : DEFAULT_PREFS.passAndPlay,
      humanSeats: {
        ...DEFAULT_HUMAN_SEATS,
        ...(parsed.humanSeats ?? {}),
        0: true,
      },
      seats,
      rules: {
        ...DEFAULT_HEARTS_RULES,
        ...(parsed.rules ?? {}),
      },
      spadesRules: {
        ...DEFAULT_SPADES_RULES,
        ...(parsed.spadesRules ?? {}),
      },
      euchreRules: {
        ...DEFAULT_EUCHRE_RULES,
        ...(parsed.euchreRules ?? {}),
      },
    }
  } catch {
    return cloneDefaults()
  }
}

export function resolveDefaultDealGame(prefs: UserPrefs): AvailableGameId {
  if (prefs.defaultDealGame === 'lastPlayed') return prefs.activeGameId
  return prefs.defaultDealGame
}

export function savePrefs(prefs: UserPrefs): void {
  try {
    localStorage.setItem(prefsKey('hearts'), JSON.stringify(prefs))
  } catch {
    /* ignore quota */
  }
}

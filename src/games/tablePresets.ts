import type { GameId } from './registry'
import { DEFAULT_HEARTS_RULES, type HeartsRulesConfig } from './hearts/types'
import { DEFAULT_SPADES_RULES, type SpadesRulesConfig } from './spades/types'
import { DEFAULT_EUCHRE_RULES, type EuchreRulesConfig } from './euchre/types'
import { snapshotRoomRules, formatRoomRules } from '../multiplayer/roomRules'
import type { RoomRulesSnapshot } from '../multiplayer/protocol'

export interface HousePreset<T> {
  id: string
  label: string
  description: string
  rules: T
}

export const HEARTS_HOUSE_PRESETS: HousePreset<HeartsRulesConfig>[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Race to 100 · pass 3 · classic moon',
    rules: { ...DEFAULT_HEARTS_RULES },
  },
  {
    id: 'club',
    label: 'Club',
    description: 'Kitchen plus J♦ −10',
    rules: { ...DEFAULT_HEARTS_RULES, jackOfDiamonds: true },
  },
  {
    id: 'no-pass',
    label: 'No pass',
    description: 'Kitchen with no passing',
    rules: { ...DEFAULT_HEARTS_RULES, passCount: 0 },
  },
]

export const SPADES_HOUSE_PRESETS: HousePreset<SpadesRulesConfig>[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Race to 500 · nil · bags 10/−100',
    rules: { ...DEFAULT_SPADES_RULES },
  },
  {
    id: 'club',
    label: 'Club',
    description: 'Kitchen plus blind nil',
    rules: { ...DEFAULT_SPADES_RULES, blindNil: true },
  },
  {
    id: 'no-bags',
    label: 'No bags',
    description: 'Kitchen without bag penalty',
    rules: { ...DEFAULT_SPADES_RULES, bagPenalty: false },
  },
]

export const EUCHRE_HOUSE_PRESETS: HousePreset<EuchreRulesConfig>[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Race to 10 · stick the dealer · loners',
    rules: { ...DEFAULT_EUCHRE_RULES },
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'Kitchen without stick-the-dealer',
    rules: { ...DEFAULT_EUCHRE_RULES, stickTheDealer: false },
  },
  {
    id: 'race-5',
    label: 'Race to 5',
    description: 'Shorter match · same kitchen rules',
    rules: { ...DEFAULT_EUCHRE_RULES, raceTo: 5 },
  },
]

function matchAll<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((k) => a[k] === b[k])
}

export function activeHousePresetId(
  gameId: GameId,
  rules: HeartsRulesConfig | SpadesRulesConfig | EuchreRulesConfig,
): string | null {
  const list =
    gameId === 'spades'
      ? SPADES_HOUSE_PRESETS
      : gameId === 'euchre'
        ? EUCHRE_HOUSE_PRESETS
        : HEARTS_HOUSE_PRESETS
  const hit = list.find((p) => matchAll(p.rules, rules))
  return hit?.id ?? null
}

export function housePresetChips(gameId: GameId, presetId: string): string[] {
  const list =
    gameId === 'spades'
      ? SPADES_HOUSE_PRESETS
      : gameId === 'euchre'
        ? EUCHRE_HOUSE_PRESETS
        : HEARTS_HOUSE_PRESETS
  const preset = list.find((p) => p.id === presetId)
  if (!preset) return []
  const snap: RoomRulesSnapshot =
    gameId === 'spades'
      ? snapshotRoomRules('spades', { spadesRules: preset.rules as SpadesRulesConfig })
      : gameId === 'euchre'
        ? snapshotRoomRules('euchre', { euchreRules: preset.rules as EuchreRulesConfig })
        : snapshotRoomRules('hearts', { rules: preset.rules as HeartsRulesConfig })
  return formatRoomRules(snap, gameId)
}

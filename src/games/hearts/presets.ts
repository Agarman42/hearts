import type { HeartsRulesConfig } from './types'
import { DEFAULT_HEARTS_RULES } from './types'

export interface HeartsPreset {
  id: string
  label: string
  description: string
  rules: HeartsRulesConfig
}

const RULE_KEYS = Object.keys(DEFAULT_HEARTS_RULES) as (keyof HeartsRulesConfig)[]

export const HEARTS_PRESETS: HeartsPreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Race to 100 · pass 3 · standard moon',
    rules: { ...DEFAULT_HEARTS_RULES },
  },
  {
    id: 'quick',
    label: 'Quick 50',
    description: 'Shorter match · pass 2 cards',
    rules: { ...DEFAULT_HEARTS_RULES, raceTo: 50, passCount: 2 },
  },
  {
    id: 'tournament',
    label: 'Tournament',
    description: 'Strict table rules · no J♦',
    rules: {
      ...DEFAULT_HEARTS_RULES,
      raceTo: 100,
      passCount: 3,
      twoOfClubsLeads: true,
      noPointsOnFirstTrick: true,
      heartsBreak: true,
      shootTheMoon: true,
      jackOfDiamonds: false,
      moonScoring: 'classic',
    },
  },
  {
    id: 'jack',
    label: 'Jack of diamonds',
    description: 'J♦ subtracts 10 from the taker',
    rules: { ...DEFAULT_HEARTS_RULES, jackOfDiamonds: true },
  },
  {
    id: 'sun',
    label: 'Sun moon',
    description: 'Shoot the sun — others take +39',
    rules: {
      ...DEFAULT_HEARTS_RULES,
      shootTheMoon: true,
      moonScoring: 'sun',
    },
  },
]

export function heartsRulesMatch(a: HeartsRulesConfig, b: HeartsRulesConfig): boolean {
  return RULE_KEYS.every((k) => a[k] === b[k])
}

export function activeHeartsPresetId(rules: HeartsRulesConfig): string | null {
  const hit = HEARTS_PRESETS.find((p) => heartsRulesMatch(p.rules, rules))
  return hit?.id ?? null
}
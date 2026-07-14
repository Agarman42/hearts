/** Hearts-specific rules and constants. */

export interface HeartsRulesConfig {
  raceTo: number
  passCount: number
  twoOfClubsLeads: boolean
  noPointsOnFirstTrick: boolean
  heartsBreak: boolean
  shootTheMoon: boolean
}

export const DEFAULT_HEARTS_RULES: HeartsRulesConfig = {
  raceTo: 100,
  passCount: 3,
  twoOfClubsLeads: true,
  noPointsOnFirstTrick: true,
  heartsBreak: true,
  shootTheMoon: true,
}

/** Hand display order: red / black / red / black (Hearts first). */
export const HEARTS_HAND_SUIT_ORDER = ['hearts', 'spades', 'diamonds', 'clubs'] as const
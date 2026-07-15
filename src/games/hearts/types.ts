/** Hearts-specific rules and constants. */

/** How a shoot-the-moon hand redistributes points. */
export type MoonScoringMode = 'classic' | 'sun' | 'noRedistribute'

export interface HeartsRulesConfig {
  raceTo: number
  passCount: number
  twoOfClubsLeads: boolean
  noPointsOnFirstTrick: boolean
  heartsBreak: boolean
  shootTheMoon: boolean
  /** J♦ subtracts 10 from the taker's hand score. */
  jackOfDiamonds: boolean
  moonScoring: MoonScoringMode
}

export const DEFAULT_HEARTS_RULES: HeartsRulesConfig = {
  raceTo: 100,
  passCount: 3,
  twoOfClubsLeads: true,
  noPointsOnFirstTrick: true,
  heartsBreak: true,
  shootTheMoon: true,
  jackOfDiamonds: false,
  moonScoring: 'classic',
}

/** Hand display order: red / black / red / black (Hearts first). */
export const HEARTS_HAND_SUIT_ORDER = ['hearts', 'spades', 'diamonds', 'clubs'] as const
/**
 * Shared contract for future trick-taking games (Spades, Euchre, …).
 * Hearts implements this shape; new games plug in without rewriting the table shell.
 */
import type { Card, Seat } from '../core/types'

export type PassDirection = 'left' | 'right' | 'across' | 'hold'

export interface TrickPlay {
  seat: Seat
  card: Card
}

export interface CompletedTrick {
  leader: Seat
  winner: Seat
  plays: TrickPlay[]
  points: number
}

export interface GameRulesConfig {
  /** Race target (classic Hearts: 100). */
  raceTo: number
  /** Cards passed each non-hold round (classic: 3). */
  passCount: number
  /** 2♣ must lead the first trick. */
  twoOfClubsLeads: boolean
  /** Cannot dump hearts or Q♠ on the opening trick. */
  noPointsOnFirstTrick: boolean
  /** Hearts may not be led until broken. */
  heartsBreak: boolean
  /** Taking all 26 penalty points dumps them on opponents. */
  shootTheMoon: boolean
}

export const DEFAULT_HEARTS_RULES: GameRulesConfig = {
  raceTo: 100,
  passCount: 3,
  twoOfClubsLeads: true,
  noPointsOnFirstTrick: true,
  heartsBreak: true,
  shootTheMoon: true,
}

/** Shared trick-taking primitives — game-agnostic shapes only. */
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

/** Thin player shape for shared table UI (Scoreboard, Overlay, seats). */
export interface TablePlayer {
  seat: Seat
  name: string
  isHuman: boolean
  characterId: string
  difficulty: 'easy' | 'medium' | 'hard'
  totalScore: number
}
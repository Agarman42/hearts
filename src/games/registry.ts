/** Multi-game registry — Hearts implements first; Spades/Euchre plug in later. */

import type { Card } from '../core/types'
import type { HeartsState } from './hearts/engine'
import {
  createInitialState,
  getLegalForHuman,
  isHeartsInProgress,
} from './hearts/engine'

export type GameId = 'hearts' | 'spades' | 'euchre'

export type AvailableGameId = 'hearts'

export interface GameMeta {
  id: GameId
  title: string
  subtitle: string
  icon: string
  available: boolean
  /** Hearts has no partners; Spades/Euchre use partnerships. */
  hasPartners: boolean
}

export const GAMES: GameMeta[] = [
  {
    id: 'hearts',
    title: 'Hearts',
    subtitle: 'Race to 100 · solo vs AI',
    icon: '♥',
    available: true,
    hasPartners: false,
  },
  {
    id: 'spades',
    title: 'Spades',
    subtitle: 'Bid · partner · bags',
    icon: '♠',
    available: false,
    hasPartners: true,
  },
  {
    id: 'euchre',
    title: 'Euchre',
    subtitle: 'Trump · march · loners',
    icon: '♦',
    available: false,
    hasPartners: true,
  },
]

export function gameMeta(id: GameId): GameMeta {
  return GAMES.find((g) => g.id === id) ?? GAMES[0]
}

/** Minimal contract each game module will fully implement. */
export interface GameModule<TState> {
  id: AvailableGameId
  createInitialState: (prefs: unknown) => TState
  isInProgress: (state: TState) => boolean
  getLegalForHuman: (state: TState) => Card[]
}

export const heartsModule: GameModule<HeartsState> = {
  id: 'hearts',
  createInitialState: (prefs) => createInitialState(prefs as Parameters<typeof createInitialState>[0]),
  isInProgress: isHeartsInProgress,
  getLegalForHuman,
}
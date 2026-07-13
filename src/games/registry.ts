/** Multi-game registry — Hearts + Spades live; Euchre plugs in later. */

import type { Card } from '../core/types'
import type { HeartsState } from './hearts/engine'
import type { SpadesState } from './spades/engine'
import {
  createInitialState as createHeartsState,
  getLegalForHuman as heartsLegal,
} from './hearts/engine'
import {
  createInitialState as createSpadesState,
  getLegalForHuman as spadesLegal,
} from './spades/engine'
import { isHeartsInProgress, isSpadesInProgress } from './inProgress'

export type GameId = 'hearts' | 'spades' | 'euchre'

export type AvailableGameId = 'hearts' | 'spades'

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
    subtitle: 'Race to 500 · partners',
    icon: '♠',
    available: true,
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
  createInitialState: (prefs) =>
    createHeartsState(prefs as Parameters<typeof createHeartsState>[0]),
  isInProgress: isHeartsInProgress,
  getLegalForHuman: heartsLegal,
}

export const spadesModule: GameModule<SpadesState> = {
  id: 'spades',
  createInitialState: (prefs) =>
    createSpadesState(prefs as Parameters<typeof createSpadesState>[0]),
  isInProgress: isSpadesInProgress,
  getLegalForHuman: spadesLegal,
}
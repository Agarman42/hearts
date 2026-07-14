/**
 * Match-in-progress checks — kept separate from engine.ts to avoid circular
 * imports (registry ↔ prefs ↔ gameSave all need these at module load time).
 */

import type { HeartsState } from './hearts/engine'
import type { SpadesState } from './spades/engine'
import type { EuchreState } from './euchre/engine'

export function isHeartsInProgress(state: HeartsState): boolean {
  return (
    state.phase === 'passing' ||
    state.phase === 'receiving' ||
    state.phase === 'playing' ||
    state.phase === 'trick_reveal' ||
    state.phase === 'hand_result'
  )
}

export function isSpadesInProgress(state: SpadesState): boolean {
  return (
    state.phase === 'bidding' ||
    state.phase === 'playing' ||
    state.phase === 'trick_reveal' ||
    state.phase === 'hand_result'
  )
}

export function isEuchreInProgress(state: EuchreState): boolean {
  return (
    state.phase === 'bidding' ||
    state.phase === 'discard' ||
    state.phase === 'playing' ||
    state.phase === 'trick_reveal' ||
    state.phase === 'hand_result'
  )
}
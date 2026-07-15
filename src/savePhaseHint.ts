import { loadGame } from './gameSave'
import type { GameId } from './games/registry'
import type { HeartsState } from './games/hearts/engine'
import type { SpadesState } from './games/spades/engine'
import type { EuchreState } from './games/euchre/engine'

/** Short label for an in-progress save — shown on home game tiles. */
export function savePhaseHint(gameId: GameId): string | null {
  const saved = loadGame(gameId)
  if (!saved) return null
  const s = saved.state
  const hand = 'handNumber' in s && typeof s.handNumber === 'number' ? s.handNumber : 0

  if (gameId === 'hearts') {
    const h = s as HeartsState
    if (h.phase === 'passing') return `Hand ${hand} · passing`
    if (h.phase === 'receiving') return `Hand ${hand} · receiving`
    if (h.phase === 'playing' || h.phase === 'trick_reveal') return `Hand ${hand} · in play`
    if (h.phase === 'hand_result') return `Hand ${hand} · scoring`
  }

  if (gameId === 'spades') {
    const sp = s as SpadesState
    if (sp.phase === 'bidding') return `Hand ${hand} · bidding`
    if (sp.phase === 'playing' || sp.phase === 'trick_reveal') return `Hand ${hand} · in play`
    if (sp.phase === 'hand_result') return `Hand ${hand} · scoring`
  }

  if (gameId === 'euchre') {
    const e = s as EuchreState
    if (e.phase === 'bidding') return `Hand ${hand} · bidding`
    if (e.phase === 'discard') return `Hand ${hand} · dealer discard`
    if (e.phase === 'loner_choice') return `Hand ${hand} · loner choice`
    if (e.phase === 'playing' || e.phase === 'trick_reveal') return `Hand ${hand} · in play`
    if (e.phase === 'hand_result') return `Hand ${hand} · scoring`
  }

  return 'In progress'
}
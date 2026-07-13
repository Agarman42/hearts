import type { Seat } from '../core/types'
import type { TablePlayer } from './types'
import type { HeartsPlayerState } from './hearts/engine'

/** Hearts-specific seat badges (not used in Spades/Euchre). */
export interface HeartsSeatExtras {
  handHearts: number
  hasQueen: boolean
  handPoints: number
}

export type SeatView = TablePlayer & {
  cardCount: number
  extras?: HeartsSeatExtras
}

export function heartsPlayerToSeatView(
  player: HeartsPlayerState,
  cardCount?: number,
): SeatView {
  return {
    seat: player.seat,
    name: player.name,
    isHuman: player.isHuman,
    characterId: player.characterId,
    difficulty: player.difficulty,
    totalScore: player.totalScore,
    cardCount: cardCount ?? player.hand.length,
    extras: {
      handHearts: player.handHearts,
      hasQueen: player.hasQueen,
      handPoints: player.handPoints,
    },
  }
}

export function seatViewsFromHearts(
  players: Record<Seat, HeartsPlayerState>,
): Record<Seat, SeatView> {
  const out = {} as Record<Seat, SeatView>
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    out[seat] = heartsPlayerToSeatView(players[seat])
  }
  return out
}
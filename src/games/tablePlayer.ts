import type { Seat } from '../core/types'
import type { TablePlayer } from './types'
import type { HeartsPlayerState } from './hearts/engine'
import type { SpadesPlayerState } from './spades/engine'
import { partnershipOf } from '../core/partnership'

export interface HeartsSeatExtras {
  handHearts: number
  hasQueen: boolean
  handPoints: number
}

export interface SpadesSeatExtras {
  bid: number | null
  nil: boolean
  tricksWon: number
  isPartner: boolean
}

export type SeatExtras = HeartsSeatExtras | SpadesSeatExtras

export type SeatView = TablePlayer & {
  cardCount: number
  extras?: SeatExtras
}

export function isHeartsExtras(extras: SeatExtras): extras is HeartsSeatExtras {
  return 'handHearts' in extras
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

export function spadesPlayerToSeatView(
  player: SpadesPlayerState,
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
      bid: player.bid,
      nil: player.nil,
      tricksWon: player.tricksWon,
      isPartner: partnershipOf(player.seat) === partnershipOf(0),
    },
  }
}

export function seatViewsFromSpades(
  players: Record<Seat, SpadesPlayerState>,
): Record<Seat, SeatView> {
  const out = {} as Record<Seat, SeatView>
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    out[seat] = spadesPlayerToSeatView(players[seat])
  }
  return out
}
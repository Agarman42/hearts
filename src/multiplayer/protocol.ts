import type { Seat } from '../core/types'
import type { Suit } from '../core/types'
import type { GameId } from '../games/registry'
import type { HeartsPlayerState, HeartsState } from '../games/hearts/engine'
import type { SpadesPlayerState, SpadesState } from '../games/spades/engine'
import type { EuchrePlayerState, EuchreState } from '../games/euchre/engine'

export type GameMode = 'local' | 'passAndPlay' | 'online'

export type ErrorCode =
  | 'not_your_turn'
  | 'illegal'
  | 'unknown_action'
  | 'unknown_token'
  | 'rate_limited'
  | 'room_full'
  | 'seat_taken'
  | 'cannot_start'
  | 'not_in_lobby'
  | 'not_in_match'

export type GameAction =
  | { type: 'toggle_pass_card'; cardId: string }
  | { type: 'confirm_pass' }
  | { type: 'accept_received' }
  | { type: 'play_card'; cardId: string }
  | { type: 'submit_bid'; bid: number; nil?: boolean; blindNil?: boolean }
  | { type: 'pass_bid' }
  | { type: 'order_up' }
  | { type: 'name_trump'; suit: Suit }
  | { type: 'discard'; cardId: string }
  | { type: 'go_alone' }
  | { type: 'with_partner' }

export type ClientMessage =
  | { type: 'hello'; token?: string; name: string }
  | { type: 'sit'; seat: Seat }
  | { type: 'stand' }
  | { type: 'sit_relative'; vsSeat: Seat; relation: 'partner' | 'opponent' }
  | { type: 'swap_request'; withSeat: Seat }
  | { type: 'swap_respond'; accept: boolean }
  | { type: 'vote_fill_ai'; approve: boolean }
  | { type: 'vote_replace_ai'; approve: boolean }
  | { type: 'start' }
  | { type: 'game_action'; action: GameAction; clientSeq: number }
  | { type: 'rematch' }
  | { type: 'leave' }

export type TableEvent =
  | { type: 'card_played'; seat: Seat; cardId: string }
  | { type: 'trick_won'; winner: Seat }
  | { type: 'bid_locked'; seat: Seat }
  | { type: 'pass_done' }
  | { type: 'hand_over' }

export type GameBundle =
  | { gameId: 'hearts'; state: HeartsState }
  | { gameId: 'spades'; state: SpadesState }
  | { gameId: 'euchre'; state: EuchreState }

export type ProjectedPlayer = { cardCount: number }

type WithCardCountPlayers<P> = Record<Seat, P & { cardCount: number }>

export type ProjectedState =
  | {
      gameId: 'hearts'
      state: Omit<HeartsState, 'players'> & { players: WithCardCountPlayers<HeartsPlayerState> }
      viewerSeat: Seat
    }
  | {
      gameId: 'spades'
      state: Omit<SpadesState, 'players'> & { players: WithCardCountPlayers<SpadesPlayerState> }
      viewerSeat: Seat
    }
  | {
      gameId: 'euchre'
      state: Omit<EuchreState, 'players'> & { players: WithCardCountPlayers<EuchrePlayerState> }
      viewerSeat: Seat
    }

export type ApplyResult =
  | { ok: true; bundle: GameBundle }
  | { ok: false; code: ErrorCode; message: string }

export interface LobbyOccupant {
  playerId: string
  name: string
  connected: boolean
}

export interface PendingSwap {
  fromSeat: Seat
  toSeat: Seat
}

export interface LobbyState {
  code: string
  gameId: GameId
  hostId: string
  phase: 'lobby' | 'starting'
  chairs: Record<Seat, LobbyOccupant | null>
  fillAiVotes: Record<string, boolean>
  pendingSwap: PendingSwap | null
  aiDifficulty: 'easy' | 'medium' | 'hard'
}

export type LobbyView = LobbyState

export type PausedInfo = {
  name: string
  until: number
  seat: Seat
}

export type ServerMessage =
  | { type: 'joined'; token: string; playerId: string; seat: Seat | null }
  | { type: 'lobby'; lobby: LobbyView }
  | { type: 'snapshot'; view: ProjectedState; seq: number; paused?: PausedInfo }
  | { type: 'event'; event: TableEvent; seq: number }
  | { type: 'paused'; name: string; until: number; seat: Seat }
  | { type: 'replace_available'; seat: Seat; name: string }
  | { type: 'error'; code: ErrorCode; message: string; seq?: number }

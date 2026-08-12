import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import type { GameId } from '../games/registry'
import type {
  ClientMessage,
  ErrorCode,
  LobbyOccupant,
  LobbyState,
} from './protocol'
import { firstEmptyJoinerSeat, partnerSeat, preferredOpponentSeat } from './seats'

export type LobbyReduceResult = {
  state: LobbyState
  error?: { code: ErrorCode; message: string }
}

function emptyChairs(): Record<Seat, LobbyOccupant | null> {
  return { 0: null, 1: null, 2: null, 3: null }
}

function seatOf(chairs: Record<Seat, LobbyOccupant | null>, playerId: string): Seat | null {
  for (const s of SEATS) {
    if (chairs[s]?.playerId === playerId) return s
  }
  return null
}

function occupiedSeats(chairs: Record<Seat, LobbyOccupant | null>): Set<Seat> {
  const set = new Set<Seat>()
  for (const s of SEATS) {
    if (chairs[s] != null) set.add(s)
  }
  return set
}

function seatedHumans(chairs: Record<Seat, LobbyOccupant | null>): LobbyOccupant[] {
  const out: LobbyOccupant[] = []
  for (const s of SEATS) {
    const o = chairs[s]
    if (o) out.push(o)
  }
  return out
}

function clearVotesAndSwap(state: LobbyState): Pick<LobbyState, 'fillAiVotes' | 'pendingSwap'> {
  return { fillAiVotes: {}, pendingSwap: null }
}

function movePlayer(
  chairs: Record<Seat, LobbyOccupant | null>,
  playerId: string,
  toSeat: Seat,
  occupant: LobbyOccupant,
): Record<Seat, LobbyOccupant | null> {
  const next = { ...chairs }
  for (const s of SEATS) {
    if (next[s]?.playerId === playerId) next[s] = null
  }
  next[toSeat] = occupant
  return next
}

export function createLobby(opts: {
  code: string
  gameId: GameId
  hostId: string
  hostName: string
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}): LobbyState {
  const chairs = emptyChairs()
  chairs[0] = { playerId: opts.hostId, name: opts.hostName, connected: true }
  return {
    code: opts.code,
    gameId: opts.gameId,
    hostId: opts.hostId,
    phase: 'lobby',
    chairs,
    fillAiVotes: {},
    pendingSwap: null,
    aiDifficulty: opts.aiDifficulty ?? 'medium',
  }
}

export function canStart(lobby: LobbyState): boolean {
  const empty = SEATS.filter((s) => lobby.chairs[s] == null)
  if (empty.length === 0) {
    return SEATS.every((s) => lobby.chairs[s] != null)
  }
  const humans = seatedHumans(lobby.chairs)
  if (humans.length === 0) return false
  return humans.every((h) => lobby.fillAiVotes[h.playerId] === true)
}

export function reduceLobby(
  state: LobbyState,
  action: ClientMessage,
  playerId: string,
): LobbyReduceResult {
  if (action.type === 'game_action' || action.type === 'rematch') {
    return {
      state,
      error: { code: 'not_in_match', message: 'Not in a match.' },
    }
  }

  switch (action.type) {
    case 'hello': {
      const existing = seatOf(state.chairs, playerId)
      if (existing != null) {
        const chairs = { ...state.chairs }
        const occ = chairs[existing]!
        chairs[existing] = { ...occ, name: action.name, connected: true }
        return { state: { ...state, chairs } }
      }
      const seat = firstEmptyJoinerSeat(state.chairs)
      if (seat == null) {
        return { state, error: { code: 'room_full', message: 'Room is full.' } }
      }
      const chairs = movePlayer(state.chairs, playerId, seat, {
        playerId,
        name: action.name,
        connected: true,
      })
      return {
        state: {
          ...state,
          chairs,
          ...clearVotesAndSwap(state),
        },
      }
    }

    case 'sit': {
      const me = seatOf(state.chairs, playerId)
      if (me == null) {
        return { state, error: { code: 'not_in_lobby', message: 'Not seated in lobby.' } }
      }
      const target = action.seat
      const occupant = state.chairs[target]
      if (occupant != null && occupant.playerId !== playerId) {
        return { state, error: { code: 'seat_taken', message: 'Seat is taken.' } }
      }
      if (me === target) return { state }
      const chairs = movePlayer(state.chairs, playerId, target, {
        ...state.chairs[me]!,
        playerId,
      })
      return {
        state: {
          ...state,
          chairs,
          ...clearVotesAndSwap(state),
        },
      }
    }

    case 'stand': {
      const me = seatOf(state.chairs, playerId)
      if (me == null) return { state }
      const chairs = { ...state.chairs, [me]: null }
      return {
        state: {
          ...state,
          chairs,
          ...clearVotesAndSwap(state),
        },
      }
    }

    case 'sit_relative': {
      const me = seatOf(state.chairs, playerId)
      if (me == null) {
        return { state, error: { code: 'not_in_lobby', message: 'Not seated in lobby.' } }
      }
      const occ = state.chairs[me]!
      if (action.relation === 'partner') {
        const target = partnerSeat(action.vsSeat)
        const at = state.chairs[target]
        if (at == null || at.playerId === playerId) {
          if (me === target) return { state }
          const chairs = movePlayer(state.chairs, playerId, target, occ)
          return {
            state: {
              ...state,
              chairs,
              ...clearVotesAndSwap(state),
            },
          }
        }
        // Occupied by another human — request swap
        return {
          state: {
            ...state,
            pendingSwap: { fromSeat: me, toSeat: target },
          },
        }
      }
      // opponent
      const occupied = occupiedSeats(state.chairs)
      // Prefer empty seats; treat own seat as free for preference
      const occupiedForPref = new Set(occupied)
      occupiedForPref.delete(me)
      const pref = preferredOpponentSeat(action.vsSeat, occupiedForPref)
      if (pref != null) {
        if (me === pref) return { state }
        const chairs = movePlayer(state.chairs, playerId, pref, occ)
        return {
          state: {
            ...state,
            chairs,
            ...clearVotesAndSwap(state),
          },
        }
      }
      const clockwise = ((action.vsSeat + 1) % 4) as Seat
      return {
        state: {
          ...state,
          pendingSwap: { fromSeat: me, toSeat: clockwise },
        },
      }
    }

    case 'swap_request': {
      const me = seatOf(state.chairs, playerId)
      if (me == null) {
        return { state, error: { code: 'not_in_lobby', message: 'Not seated in lobby.' } }
      }
      const target = action.withSeat
      if (state.chairs[target] == null) {
        return { state, error: { code: 'illegal', message: 'Target seat is empty.' } }
      }
      if (target === me) return { state }
      return {
        state: {
          ...state,
          pendingSwap: { fromSeat: me, toSeat: target },
        },
      }
    }

    case 'swap_respond': {
      const pending = state.pendingSwap
      if (pending == null) return { state }
      const me = seatOf(state.chairs, playerId)
      if (me == null || me !== pending.toSeat) {
        return { state, error: { code: 'illegal', message: 'Not the swap target.' } }
      }
      if (!action.accept) {
        return { state: { ...state, pendingSwap: null } }
      }
      const a = state.chairs[pending.fromSeat]
      const b = state.chairs[pending.toSeat]
      if (a == null || b == null) {
        return { state: { ...state, pendingSwap: null } }
      }
      const chairs = { ...state.chairs }
      chairs[pending.fromSeat] = b
      chairs[pending.toSeat] = a
      return {
        state: {
          ...state,
          chairs,
          ...clearVotesAndSwap(state),
        },
      }
    }

    case 'vote_fill_ai': {
      const me = seatOf(state.chairs, playerId)
      if (me == null) {
        return { state, error: { code: 'not_in_lobby', message: 'Not seated in lobby.' } }
      }
      const fillAiVotes = { ...state.fillAiVotes }
      if (action.approve) {
        fillAiVotes[playerId] = true
      } else {
        delete fillAiVotes[playerId]
      }
      return { state: { ...state, fillAiVotes } }
    }

    case 'start': {
      if (!canStart(state)) {
        return {
          state,
          error: { code: 'cannot_start', message: 'Cannot start yet.' },
        }
      }
      return { state: { ...state, phase: 'starting' } }
    }

    case 'leave': {
      const me = seatOf(state.chairs, playerId)
      if (me == null) return { state }
      const chairs = { ...state.chairs, [me]: null }
      return {
        state: {
          ...state,
          chairs,
          ...clearVotesAndSwap(state),
        },
      }
    }

    default:
      return {
        state,
        error: { code: 'unknown_action', message: 'Unknown lobby action.' },
      }
  }
}

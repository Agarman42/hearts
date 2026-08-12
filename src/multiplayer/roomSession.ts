import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import { DEFAULT_CHARACTER_IDS } from '../characters'
import { DEFAULT_NAMES, type SeatPrefs } from '../prefs'
import type { GameId } from '../games/registry'
import { DEFAULT_HEARTS_RULES } from '../games/hearts/types'
import {
  createInitialState as createHeartsState,
  dealHand as dealHearts,
  runAiTurn as runHeartsAi,
  startNewGame as startHearts,
  type HeartsState,
} from '../games/hearts/engine'
import {
  advanceAfterTrick as advanceSpadesTrick,
  createInitialState as createSpadesState,
  dealHand as dealSpades,
  nextHand as nextSpadesHand,
  runAiTurn as runSpadesAi,
  startNewGame as startSpades,
  type SpadesState,
} from '../games/spades/engine'
import {
  createInitialState as createEuchreState,
  dealHand as dealEuchre,
  runAiTurn as runEuchreAi,
  startNewGame as startEuchre,
  type EuchreState,
} from '../games/euchre/engine'
import { applyGameAction } from './apply'
import { canStart, createLobby, reduceLobby } from './lobby'
import { projectForSeat } from './project'
import type {
  ClientMessage,
  ErrorCode,
  GameBundle,
  LobbyState,
  ServerMessage,
} from './protocol'
import { newPlayerToken } from './token'

export type DelayKind = 'ai' | 'recap' | 'lobby_disconnect' | 'match_disconnect'

export type Outbox = {
  to: { playerId: string; msg: ServerMessage }[]
  delayMs?: { kind: DelayKind; ms: number; seat?: Seat }
}

export type RoomSessionCreateOpts = {
  code: string
  gameId: GameId
  hostId: string
  hostName: string
  aiDifficulty?: 'easy' | 'medium' | 'hard'
}

export type RoomSessionJSON = {
  lobby: LobbyState
  tokens: Record<string, string>
  bundle: GameBundle | null
  seq: number
  lastClientSeq: Record<string, number>
  disconnectedAt: Record<string, number>
  pendingDelay: { kind: DelayKind; fireAt: number; seat?: Seat } | null
}

const AI_DELAY_MS = 900
const TRICK_REVEAL_MS = 1100
const HAND_RECAP_MS = 3000

type IdentityPlayer = { isHuman: boolean; name: string; difficulty: 'easy' | 'medium' | 'hard' }

function seatOf(chairs: LobbyState['chairs'], playerId: string): Seat | null {
  for (const s of SEATS) {
    if (chairs[s]?.playerId === playerId) return s
  }
  return null
}

function mapFromRecord<V>(rec: Record<string, V>): Map<string, V> {
  return new Map(Object.entries(rec))
}

function recordFromMap<V>(map: Map<string, V>): Record<string, V> {
  return Object.fromEntries(map.entries())
}

function seatPrefsFromLobby(lobby: LobbyState): Record<Seat, SeatPrefs> {
  const seats = {} as Record<Seat, SeatPrefs>
  for (const seat of SEATS) {
    const occ = lobby.chairs[seat]
    seats[seat] = {
      name: occ?.name ?? DEFAULT_NAMES[seat],
      difficulty: lobby.aiDifficulty,
      characterId: DEFAULT_CHARACTER_IDS[seat],
    }
  }
  return seats
}

function patchIdentities<T extends { players: Record<Seat, IdentityPlayer> }>(
  state: T,
  lobby: LobbyState,
): T {
  const players = { ...state.players }
  for (const seat of SEATS) {
    const occ = lobby.chairs[seat]
    players[seat] = {
      ...players[seat],
      isHuman: occ != null,
      name: occ?.name ?? DEFAULT_NAMES[seat],
      difficulty: lobby.aiDifficulty,
    }
  }
  return { ...state, players }
}

function startBundle(lobby: LobbyState): GameBundle {
  const seats = seatPrefsFromLobby(lobby)
  // Engines hardcode isHuman to seat 0. Patch identities before the last
  // dealHand so auto-AI bids/passes skip real humans in other chairs.
  if (lobby.gameId === 'spades') {
    let state: SpadesState = createSpadesState({ seats })
    state = startSpades(state)
    state = patchIdentities(state, lobby)
    state = dealSpades(state)
    return { gameId: 'spades', state }
  }
  if (lobby.gameId === 'euchre') {
    let state: EuchreState = createEuchreState({ seats })
    state = startEuchre(state)
    state = patchIdentities(state, lobby)
    state = dealEuchre(state)
    return { gameId: 'euchre', state }
  }
  let state: HeartsState = createHeartsState({ seats, rules: DEFAULT_HEARTS_RULES })
  state = startHearts(state)
  state = patchIdentities(state, lobby)
  state = dealHearts(state)
  return { gameId: 'hearts', state }
}

function runAi(bundle: GameBundle): GameBundle {
  if (bundle.gameId === 'spades') {
    return { gameId: 'spades', state: runSpadesAi(bundle.state) }
  }
  if (bundle.gameId === 'euchre') {
    return { gameId: 'euchre', state: runEuchreAi(bundle.state) }
  }
  return { gameId: 'hearts', state: runHeartsAi(bundle.state) }
}

function whoseTurn(bundle: GameBundle): Seat | null {
  return bundle.state.whoseTurn
}

function isAiSeat(bundle: GameBundle, seat: Seat): boolean {
  return !bundle.state.players[seat].isHuman
}

export class RoomSession {
  private lobby: LobbyState
  private tokens = new Map<string, string>()
  private bundle: GameBundle | null = null
  private seq = 0
  private lastClientSeq = new Map<string, number>()
  private disconnectedAt = new Map<string, number>()
  private pendingDelay: { kind: DelayKind; fireAt: number; seat?: Seat } | null = null

  private constructor(lobby: LobbyState) {
    this.lobby = lobby
  }

  static create(opts: RoomSessionCreateOpts): RoomSession {
    return new RoomSession(createLobby(opts))
  }

  static fromJSON(data: RoomSessionJSON): RoomSession {
    const room = new RoomSession(data.lobby)
    room.tokens = mapFromRecord(data.tokens)
    room.bundle = data.bundle
    room.seq = data.seq
    room.lastClientSeq = mapFromRecord(data.lastClientSeq)
    room.disconnectedAt = mapFromRecord(data.disconnectedAt)
    room.pendingDelay = data.pendingDelay
    return room
  }

  toJSON(): RoomSessionJSON {
    return {
      lobby: this.lobby,
      tokens: recordFromMap(this.tokens),
      bundle: this.bundle,
      seq: this.seq,
      lastClientSeq: recordFromMap(this.lastClientSeq),
      disconnectedAt: recordFromMap(this.disconnectedAt),
      pendingDelay: this.pendingDelay,
    }
  }

  /** @internal tests / later tasks */
  debugBundle(): GameBundle | null {
    return this.bundle
  }

  /** @internal tests / later tasks */
  debugLobby(): LobbyState {
    return this.lobby
  }

  playerIdForToken(token: string): string | undefined {
    for (const [playerId, t] of this.tokens) {
      if (t === token) return playerId
    }
    return undefined
  }

  hostHasToken(): boolean {
    return this.tokens.has(this.lobby.hostId)
  }

  handle(playerId: string, msg: ClientMessage, now: number): Outbox {
    if (msg.type === 'hello') {
      return this.handleHello(playerId, msg, now)
    }
    if (msg.type === 'start') {
      return this.handleStart(playerId, msg, now)
    }
    if (msg.type === 'game_action') {
      return this.handleGameAction(playerId, msg, now)
    }
    if (msg.type === 'leave' && this.bundle != null) {
      this.disconnectedAt.set(playerId, now)
      this.setChairConnected(playerId, false)
      return { to: [] }
    }
    if (msg.type === 'rematch') {
      return this.err(playerId, 'not_in_match', 'Rematch is not available.')
    }
    return this.handleLobbyAction(playerId, msg)
  }

  tick(now: number): Outbox {
    if (!this.bundle) return { to: [] }
    if (this.pendingDelay && now < this.pendingDelay.fireAt) {
      return { to: [] }
    }

    if (this.bundle.gameId === 'spades') {
      if (this.bundle.state.phase === 'trick_reveal') {
        this.bundle = { gameId: 'spades', state: advanceSpadesTrick(this.bundle.state) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
      if (this.bundle.state.phase === 'hand_result' && !this.bundle.state.matchComplete) {
        this.bundle = { gameId: 'spades', state: nextSpadesHand(this.bundle.state) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
    }

    const turn = whoseTurn(this.bundle)
    if (turn == null || !isAiSeat(this.bundle, turn)) {
      this.pendingDelay = null
      return { to: [] }
    }
    this.bundle = runAi(this.bundle)
    this.seq += 1
    this.pendingDelay = null
    return this.snapshotsWithAiDelay(now)
  }

  onDisconnect(playerId: string, now: number): Outbox {
    this.disconnectedAt.set(playerId, now)
    this.setChairConnected(playerId, false)
    if (this.bundle != null) return { to: [] }
    return this.broadcastLobby()
  }

  private handleHello(
    playerId: string,
    msg: Extract<ClientMessage, { type: 'hello' }>,
    now: number,
  ): Outbox {
    if (msg.token) {
      const owner = this.playerIdForToken(msg.token)
      if (owner) return this.helloKnown(owner, msg, now)
      if (this.bundle != null) {
        return this.err(playerId, 'unknown_token', 'Unknown token.')
      }
    }
    if (this.tokens.has(playerId)) {
      return this.helloKnown(playerId, msg, now)
    }
    if (this.bundle != null) {
      return this.err(playerId, 'unknown_token', 'Unknown token.')
    }
    if (!this.tokens.has(this.lobby.hostId)) {
      playerId = this.lobby.hostId
    }
    return this.helloNew(playerId, msg)
  }

  private helloNew(playerId: string, msg: Extract<ClientMessage, { type: 'hello' }>): Outbox {
    const result = reduceLobby(this.lobby, msg, playerId)
    this.lobby = result.state
    if (result.error) {
      return this.err(playerId, result.error.code, result.error.message)
    }
    const token = newPlayerToken()
    this.tokens.set(playerId, token)
    this.disconnectedAt.delete(playerId)
    const seat = seatOf(this.lobby.chairs, playerId)
    const joined: ServerMessage = { type: 'joined', token, playerId, seat }
    return {
      to: [{ playerId, msg: joined }, ...this.broadcastLobby().to],
    }
  }

  private helloKnown(
    playerId: string,
    msg: Extract<ClientMessage, { type: 'hello' }>,
    _now: number,
  ): Outbox {
    this.disconnectedAt.delete(playerId)
    const result = reduceLobby(this.lobby, msg, playerId)
    this.lobby = result.state
    const token = this.tokens.get(playerId) ?? newPlayerToken()
    this.tokens.set(playerId, token)
    const seat = seatOf(this.lobby.chairs, playerId)
    const joined: ServerMessage = { type: 'joined', token, playerId, seat }
    if (this.bundle != null && seat != null) {
      return {
        to: [
          { playerId, msg: joined },
          {
            playerId,
            msg: {
              type: 'snapshot',
              view: projectForSeat(this.bundle, seat),
              seq: this.seq,
            },
          },
        ],
      }
    }
    return { to: [{ playerId, msg: joined }, ...this.broadcastLobby().to] }
  }

  private handleStart(
    playerId: string,
    msg: Extract<ClientMessage, { type: 'start' }>,
    now: number,
  ): Outbox {
    if (this.bundle != null) {
      return this.err(playerId, 'cannot_start', 'Already started.', this.seq)
    }
    if (!canStart(this.lobby)) {
      return this.err(playerId, 'cannot_start', 'Cannot start yet.')
    }
    const result = reduceLobby(this.lobby, msg, playerId)
    this.lobby = result.state
    if (result.error) {
      return this.err(playerId, result.error.code, result.error.message)
    }
    this.bundle = startBundle(this.lobby)
    this.seq += 1
    return this.snapshotsWithAiDelay(now)
  }

  private handleGameAction(
    playerId: string,
    msg: Extract<ClientMessage, { type: 'game_action' }>,
    now: number,
  ): Outbox {
    if (!this.bundle) {
      return this.err(playerId, 'not_in_match', 'Not in a match.')
    }
    const seat = seatOf(this.lobby.chairs, playerId)
    if (seat == null) {
      return this.err(playerId, 'not_in_match', 'Not seated in this match.', this.seq)
    }
    const last = this.lastClientSeq.get(playerId)
    if (last != null && msg.clientSeq <= last) {
      return {
        to: [
          {
            playerId,
            msg: {
              type: 'snapshot',
              view: projectForSeat(this.bundle, seat),
              seq: this.seq,
            },
          },
        ],
      }
    }
    const applied = applyGameAction(this.bundle, msg.action, seat)
    if (!applied.ok) {
      return {
        to: [
          {
            playerId,
            msg: {
              type: 'error',
              code: applied.code,
              message: applied.message,
              seq: this.seq,
            },
          },
          {
            playerId,
            msg: {
              type: 'snapshot',
              view: projectForSeat(this.bundle, seat),
              seq: this.seq,
            },
          },
        ],
      }
    }
    this.lastClientSeq.set(playerId, msg.clientSeq)
    this.bundle = applied.bundle
    this.seq += 1
    return this.snapshotsWithAiDelay(now)
  }

  private handleLobbyAction(playerId: string, msg: ClientMessage): Outbox {
    if (this.bundle != null) {
      return this.err(playerId, 'not_in_lobby', 'Match already started.', this.seq)
    }
    const result = reduceLobby(this.lobby, msg, playerId)
    this.lobby = result.state
    if (result.error) {
      return this.err(playerId, result.error.code, result.error.message)
    }
    return this.broadcastLobby()
  }

  private snapshotsWithAiDelay(now: number): Outbox {
    const to = this.snapshotMessages()
    const delay = this.nextDelay()
    if (!delay) {
      this.pendingDelay = null
      return { to }
    }
    this.pendingDelay = { kind: delay.kind, fireAt: now + delay.ms, seat: delay.seat }
    return { to, delayMs: delay }
  }

  private snapshotMessages(): { playerId: string; msg: ServerMessage }[] {
    if (!this.bundle) return []
    const to: { playerId: string; msg: ServerMessage }[] = []
    for (const id of this.connectedIds()) {
      const seat = seatOf(this.lobby.chairs, id)
      if (seat == null) continue
      to.push({
        playerId: id,
        msg: {
          type: 'snapshot',
          view: projectForSeat(this.bundle, seat),
          seq: this.seq,
        },
      })
    }
    return to
  }

  private nextDelay(): Outbox['delayMs'] | undefined {
    if (!this.bundle) return undefined
    if (this.bundle.gameId === 'spades') {
      if (this.bundle.state.phase === 'trick_reveal') {
        return { kind: 'recap', ms: TRICK_REVEAL_MS }
      }
      if (this.bundle.state.phase === 'hand_result' && !this.bundle.state.matchComplete) {
        return { kind: 'recap', ms: HAND_RECAP_MS }
      }
    }
    const turn = whoseTurn(this.bundle)
    if (turn == null || !isAiSeat(this.bundle, turn)) return undefined
    return { kind: 'ai', ms: AI_DELAY_MS, seat: turn }
  }

  private broadcastLobby(): Outbox {
    const lobbyMsg: ServerMessage = { type: 'lobby', lobby: this.lobby }
    return {
      to: this.connectedIds().map((playerId) => ({ playerId, msg: lobbyMsg })),
    }
  }

  private connectedIds(): string[] {
    const ids: string[] = []
    for (const id of this.tokens.keys()) {
      if (!this.disconnectedAt.has(id)) ids.push(id)
    }
    return ids
  }

  private setChairConnected(playerId: string, connected: boolean): void {
    const seat = seatOf(this.lobby.chairs, playerId)
    if (seat == null) return
    const occ = this.lobby.chairs[seat]
    if (!occ) return
    this.lobby = {
      ...this.lobby,
      chairs: { ...this.lobby.chairs, [seat]: { ...occ, connected } },
    }
  }

  private err(playerId: string, code: ErrorCode, message: string, seq?: number): Outbox {
    return {
      to: [{ playerId, msg: { type: 'error', code, message, ...(seq != null ? { seq } : {}) } }],
    }
  }
}

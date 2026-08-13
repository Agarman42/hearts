import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import { DEFAULT_CHARACTER_IDS } from '../characters'
import { DEFAULT_NAMES, type SeatPrefs } from '../prefs'
import type { GameId } from '../games/registry'
import { DEFAULT_HEARTS_RULES } from '../games/hearts/types'
import { choosePassCards } from '../games/hearts/ai'
import {
  advanceAfterTrick as advanceHeartsTrick,
  createInitialState as createHeartsState,
  dealHand as dealHearts,
  nextHand as nextHeartsHand,
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
  ackDiscardComplete,
  ackLonerChoice,
  ackTrumpCall,
  advanceAfterTrick as advanceEuchreTrick,
  createInitialState as createEuchreState,
  dealHand as dealEuchre,
  nextHand as nextEuchreHand,
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
  PausedInfo,
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
  /** Pre-minted host token from POST /rooms so a joiner cannot claim the host seat. */
  hostToken?: string
}

export type RoomSessionJSON = {
  lobby: LobbyState
  tokens: Record<string, string>
  bundle: GameBundle | null
  seq: number
  lastClientSeq: Record<string, number>
  disconnectedAt: Record<string, number>
  pendingDelay: { kind: DelayKind; fireAt: number; seat?: Seat } | null
  pausedSeat?: Seat | null
  pausedUntil?: number | null
  replaceVotes?: Record<string, boolean>
  replaceSeat?: Seat | null
  spectators?: string[]
  idleSince?: number | null
  closed?: boolean
}

const AI_DELAY_MS = 900
const TRICK_REVEAL_MS = 1100
const HAND_RECAP_MS = 3000
const LOBBY_GRACE_MS = 30_000
const MATCH_GRACE_MS = 90_000
const IDLE_CLOSE_MS = 10 * 60_000

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
  spectators: ReadonlySet<string>,
): T {
  const players = { ...state.players }
  for (const seat of SEATS) {
    const occ = lobby.chairs[seat]
    players[seat] = {
      ...players[seat],
      isHuman: occ != null && !spectators.has(occ.playerId),
      name: occ?.name ?? DEFAULT_NAMES[seat],
      difficulty: lobby.aiDifficulty,
    }
  }
  return { ...state, players }
}

function startBundle(lobby: LobbyState, spectators: ReadonlySet<string> = new Set()): GameBundle {
  const seats = seatPrefsFromLobby(lobby)
  // Engines hardcode isHuman to seat 0. Patch identities before the last
  // dealHand so auto-AI bids/passes skip real humans in other chairs.
  if (lobby.gameId === 'spades') {
    let state: SpadesState = createSpadesState({ seats })
    state = startSpades(state)
    state = patchIdentities(state, lobby, spectators)
    state = dealSpades(state)
    return { gameId: 'spades', state }
  }
  if (lobby.gameId === 'euchre') {
    let state: EuchreState = createEuchreState({ seats })
    state = startEuchre(state)
    state = patchIdentities(state, lobby, spectators)
    state = dealEuchre(state)
    return { gameId: 'euchre', state }
  }
  let state: HeartsState = createHeartsState({ seats, rules: DEFAULT_HEARTS_RULES })
  state = startHearts(state)
  state = patchIdentities(state, lobby, spectators)
  state = dealHearts(state)
  return { gameId: 'hearts', state: fillAiPassSelections(state) }
}

function fillAiPassSelections(state: HeartsState): HeartsState {
  if (state.phase !== 'passing' || state.passDirection === 'hold') return state
  const passSelections = { ...state.passSelections }
  const players = { ...state.players }
  const need = state.rules.passCount
  for (const seat of SEATS) {
    if (players[seat].isHuman) continue
    if ((passSelections[seat]?.length ?? 0) === need) continue
    const picks = choosePassCards(players[seat].hand, players[seat].difficulty, need)
    passSelections[seat] = picks
    players[seat] = { ...players[seat], selectedPass: picks }
  }
  return { ...state, passSelections, players }
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

function matchIsOver(bundle: GameBundle): boolean {
  const s = bundle.state
  return s.matchComplete === true || s.phase === 'game_over'
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
  private pausedSeat: Seat | null = null
  private pausedUntil: number | null = null
  private replaceVotes: Record<string, boolean> = {}
  private replaceSeat: Seat | null = null
  private spectators = new Set<string>()
  private idleSince: number | null = null
  private closed = false

  private constructor(lobby: LobbyState) {
    this.lobby = lobby
  }

  static create(opts: RoomSessionCreateOpts): RoomSession {
    const room = new RoomSession(createLobby(opts))
    if (opts.hostToken) {
      room.tokens.set(opts.hostId, opts.hostToken)
    }
    return room
  }

  static fromJSON(data: RoomSessionJSON): RoomSession {
    const room = new RoomSession(data.lobby)
    room.tokens = mapFromRecord(data.tokens)
    room.bundle = data.bundle
    room.seq = data.seq
    room.lastClientSeq = mapFromRecord(data.lastClientSeq)
    room.disconnectedAt = mapFromRecord(data.disconnectedAt)
    room.pendingDelay = data.pendingDelay
    room.pausedSeat = data.pausedSeat ?? null
    room.pausedUntil = data.pausedUntil ?? null
    room.replaceVotes = data.replaceVotes ?? {}
    room.replaceSeat = data.replaceSeat ?? null
    room.spectators = new Set(data.spectators ?? [])
    room.idleSince = data.idleSince ?? null
    room.closed = data.closed ?? false
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
      pausedSeat: this.pausedSeat,
      pausedUntil: this.pausedUntil,
      replaceVotes: this.replaceVotes,
      replaceSeat: this.replaceSeat,
      spectators: [...this.spectators],
      idleSince: this.idleSince,
      closed: this.closed,
    }
  }

  isClosed(): boolean {
    return this.closed
  }

  /** @internal tests / later tasks */
  debugBundle(): GameBundle | null {
    return this.bundle
  }

  /** @internal tests / later tasks */
  debugLobby(): LobbyState {
    return this.lobby
  }

  /** @internal tests — mark the current match complete without playing it out */
  debugForceMatchOver(): void {
    if (!this.bundle) return
    this.bundle = {
      ...this.bundle,
      state: { ...this.bundle.state, matchComplete: true, phase: 'hand_result' },
    } as GameBundle
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
      return this.markDisconnected(playerId, now)
    }
    if (msg.type === 'vote_replace_ai') {
      return this.handleVoteReplace(playerId, msg, now)
    }
    if (msg.type === 'rematch') {
      return this.handleRematch(playerId, now)
    }
    return this.handleLobbyAction(playerId, msg)
  }

  tick(now: number): Outbox {
    if (this.closed) return { to: [] }

    if (this.idleSince != null && now >= this.idleSince + IDLE_CLOSE_MS) {
      this.closed = true
      this.pendingDelay = null
      return { to: [] }
    }

    if (!this.bundle) {
      return this.tickLobbyDisconnects(now)
    }

    const replaceOut = this.tickMatchReplace(now)
    if (replaceOut) return this.withWake(replaceOut, now)

    if (this.idleSince != null) {
      return this.withWake({ to: [] }, now)
    }

    if (this.isTurnPaused()) {
      return this.withWake({ to: [] }, now)
    }

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

    if (this.bundle.gameId === 'hearts') {
      if (this.bundle.state.phase === 'trick_reveal') {
        this.bundle = { gameId: 'hearts', state: advanceHeartsTrick(this.bundle.state) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
      if (this.bundle.state.phase === 'hand_result' && !this.bundle.state.matchComplete) {
        this.bundle = { gameId: 'hearts', state: fillAiPassSelections(nextHeartsHand(this.bundle.state)) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
    }

    if (this.bundle.gameId === 'euchre') {
      const s = this.bundle.state
      if (s.awaitingTrumpAck) {
        this.bundle = { gameId: 'euchre', state: ackTrumpCall(s) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
      if (s.awaitingDiscardAck) {
        this.bundle = { gameId: 'euchre', state: ackDiscardComplete(s) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
      if (s.awaitingLonerAck) {
        this.bundle = { gameId: 'euchre', state: ackLonerChoice(s) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
      if (s.phase === 'trick_reveal') {
        this.bundle = { gameId: 'euchre', state: advanceEuchreTrick(s) }
        this.seq += 1
        this.pendingDelay = null
        return this.snapshotsWithAiDelay(now)
      }
      if (s.phase === 'hand_result' && !s.matchComplete) {
        this.bundle = { gameId: 'euchre', state: nextEuchreHand(s) }
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

  markDisconnected(playerId: string, now: number): Outbox {
    if (this.closed) return { to: [] }
    if (!this.tokens.has(playerId) && seatOf(this.lobby.chairs, playerId) == null) {
      return { to: [] }
    }
    this.disconnectedAt.set(playerId, now)
    this.setChairConnected(playerId, false)

    if (this.bundle == null) {
      return this.withWake(this.broadcastLobby(), now)
    }

    const remaining = this.remainingHumanIds()
    if (remaining.length === 0) {
      this.idleSince = now
      this.pendingDelay = null
      const seat = seatOf(this.lobby.chairs, playerId)
      const name = seat != null ? this.seatName(seat) : 'A player'
      const until = now + MATCH_GRACE_MS
      if (seat != null && !this.spectators.has(playerId)) {
        this.pausedSeat = seat
        this.pausedUntil = until
      }
      return this.withWake(
        {
          to: remaining.length
            ? []
            : this.connectedIds().map((id) => ({
                playerId: id,
                msg: {
                  type: 'paused' as const,
                  name,
                  until,
                  seat: seat ?? 0,
                },
              })),
        },
        now,
      )
    }

    const seat = seatOf(this.lobby.chairs, playerId)
    const until = now + MATCH_GRACE_MS
    if (seat != null && !this.spectators.has(playerId) && this.isHumanSeat(seat)) {
      if (this.pausedSeat == null) {
        this.pausedSeat = seat
        this.pausedUntil = until
        this.replaceVotes = {}
      }
    }

    return this.withWake({ to: this.presenceMessages() }, now)
  }

  /** @deprecated use markDisconnected */
  onDisconnect(playerId: string, now: number): Outbox {
    return this.markDisconnected(playerId, now)
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
    now: number,
  ): Outbox {
    this.disconnectedAt.delete(playerId)
    this.setChairConnected(playerId, true)
    const result = reduceLobby(this.lobby, msg, playerId)
    this.lobby = result.state
    const token = this.tokens.get(playerId) ?? newPlayerToken()
    this.tokens.set(playerId, token)
    const seat = seatOf(this.lobby.chairs, playerId)
    if (this.pausedSeat != null && seat === this.pausedSeat && !this.spectators.has(playerId)) {
      this.clearPause()
    }
    if (this.remainingHumanIds().length > 0) {
      this.idleSince = null
    }
    // Hello is a new connection; the client remounts seqRef at 0.
    this.lastClientSeq.delete(playerId)
    const joined: ServerMessage = { type: 'joined', token, playerId, seat }
    if (this.bundle != null && seat != null) {
      const snaps = this.snapshotsWithAiDelay(now)
      return { ...snaps, to: [{ playerId, msg: joined }, ...snaps.to] }
    }
    return this.withWake(
      { to: [{ playerId, msg: joined }, ...this.broadcastLobby().to] },
      now,
    )
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
    this.bundle = startBundle(this.lobby, this.spectators)
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
    if (this.spectators.has(playerId) || !this.isHumanSeat(seat)) {
      return this.err(playerId, 'not_in_match', 'You are spectating this match.', this.seq)
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
    if (delay) {
      this.pendingDelay = { kind: delay.kind, fireAt: now + delay.ms, seat: delay.seat }
    } else {
      this.pendingDelay = null
    }
    return this.withWake({ to, ...(delay ? { delayMs: delay } : {}) }, now)
  }

  private snapshotMessages(): { playerId: string; msg: ServerMessage }[] {
    if (!this.bundle) return []
    const to: { playerId: string; msg: ServerMessage }[] = []
    for (const id of this.connectedIds()) {
      const seat = seatOf(this.lobby.chairs, id)
      if (seat == null) continue
      to.push(this.snapshotEntry(id, seat))
    }
    return to
  }

  private snapshotEntry(
    playerId: string,
    seat: Seat,
  ): { playerId: string; msg: ServerMessage } {
    const paused = this.currentPaused()
    return {
      playerId,
      msg: {
        type: 'snapshot',
        view: projectForSeat(this.bundle!, seat),
        seq: this.seq,
        ...(paused ? { paused } : {}),
      },
    }
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
    if (this.bundle.gameId === 'hearts') {
      if (this.bundle.state.phase === 'trick_reveal') {
        return { kind: 'recap', ms: TRICK_REVEAL_MS }
      }
      if (this.bundle.state.phase === 'hand_result' && !this.bundle.state.matchComplete) {
        return { kind: 'recap', ms: HAND_RECAP_MS }
      }
    }
    if (this.bundle.gameId === 'euchre') {
      const s = this.bundle.state
      if (s.awaitingTrumpAck || s.awaitingDiscardAck || s.awaitingLonerAck) {
        return { kind: 'recap', ms: HAND_RECAP_MS }
      }
      if (s.phase === 'trick_reveal') {
        return { kind: 'recap', ms: TRICK_REVEAL_MS }
      }
      if (s.phase === 'hand_result' && !s.matchComplete) {
        return { kind: 'recap', ms: HAND_RECAP_MS }
      }
    }
    if (this.isTurnPaused() || this.idleSince != null) return undefined
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

  private handleVoteReplace(
    playerId: string,
    msg: Extract<ClientMessage, { type: 'vote_replace_ai' }>,
    now: number,
  ): Outbox {
    if (!this.bundle) {
      return this.err(playerId, 'not_in_match', 'Not in a match.')
    }
    const target = this.replaceableSeat(now)
    if (target == null) {
      return this.err(playerId, 'illegal', 'Replace is not available yet.')
    }
    if (this.disconnectedAt.has(playerId) || this.spectators.has(playerId)) {
      return this.err(playerId, 'illegal', 'Only remaining players can vote.')
    }
    const voterSeat = seatOf(this.lobby.chairs, playerId)
    if (voterSeat == null || !this.isHumanSeat(voterSeat) || voterSeat === target) {
      return this.err(playerId, 'illegal', 'Only remaining players can vote.')
    }
    this.replaceSeat = target
    if (msg.approve) this.replaceVotes[playerId] = true
    else delete this.replaceVotes[playerId]

    const remaining = this.remainingHumanIds().filter((id) => {
      const s = seatOf(this.lobby.chairs, id)
      return s != null && s !== target
    })
    if (remaining.length > 0 && remaining.every((id) => this.replaceVotes[id] === true)) {
      this.applyReplace(target)
      this.seq += 1
      return this.snapshotsWithAiDelay(now)
    }
    return this.withWake({ to: this.replaceAvailableMessages() }, now)
  }

  private handleRematch(playerId: string, now: number): Outbox {
    if (!this.bundle) {
      return this.err(playerId, 'not_in_match', 'Not in a match.')
    }
    if (playerId !== this.lobby.hostId) {
      return this.err(playerId, 'illegal', 'Only the host can rematch.')
    }
    if (!matchIsOver(this.bundle)) {
      return this.err(playerId, 'illegal', 'Rematch is only available after the match ends.')
    }
    this.bundle = startBundle(this.lobby, this.spectators)
    this.seq += 1
    this.lastClientSeq.clear()
    this.clearPause()
    this.lobby = { ...this.lobby, phase: 'starting', fillAiVotes: {}, pendingSwap: null }
    return this.snapshotsWithAiDelay(now)
  }

  private applyReplace(seat: Seat): void {
    if (!this.bundle) return
    const occ = this.lobby.chairs[seat]
    if (occ) this.spectators.add(occ.playerId)
    const players = { ...this.bundle.state.players }
    players[seat] = { ...players[seat], isHuman: false }
    this.bundle = { ...this.bundle, state: { ...this.bundle.state, players } } as GameBundle
    if (this.bundle.gameId === 'hearts') {
      this.bundle = {
        gameId: 'hearts',
        state: fillAiPassSelections(this.bundle.state),
      }
    }
    this.clearPause()
    if (this.remainingHumanIds().length === 0) {
      this.idleSince = this.idleSince ?? Date.now()
      this.pendingDelay = null
    }
  }

  private tickLobbyDisconnects(now: number): Outbox {
    let changed = false
    for (const [playerId, at] of [...this.disconnectedAt.entries()]) {
      if (now < at + LOBBY_GRACE_MS) continue
      const result = reduceLobby(this.lobby, { type: 'stand' }, playerId)
      this.lobby = result.state
      this.disconnectedAt.delete(playerId)
      changed = true
    }
    if (!changed) return this.withWake({ to: [] }, now)
    return this.withWake(this.broadcastLobby(), now)
  }

  private tickMatchReplace(now: number): Outbox | null {
    if (this.replaceSeat != null) return null
    const target = this.replaceableSeat(now)
    if (target == null) return null
    this.replaceSeat = target
    this.replaceVotes = {}
    return { to: this.replaceAvailableMessages() }
  }

  private replaceableSeat(now: number): Seat | null {
    if (!this.bundle) return null
    if (this.replaceSeat != null) {
      const occ = this.lobby.chairs[this.replaceSeat]
      if (
        occ &&
        this.disconnectedAt.has(occ.playerId) &&
        this.isHumanSeat(this.replaceSeat)
      ) {
        return this.replaceSeat
      }
    }
    for (const seat of SEATS) {
      const occ = this.lobby.chairs[seat]
      if (!occ || this.spectators.has(occ.playerId) || !this.isHumanSeat(seat)) continue
      const at = this.disconnectedAt.get(occ.playerId)
      if (at != null && now >= at + MATCH_GRACE_MS) return seat
    }
    return null
  }

  private remainingHumanIds(): string[] {
    const ids: string[] = []
    for (const seat of SEATS) {
      const occ = this.lobby.chairs[seat]
      if (!occ || this.spectators.has(occ.playerId)) continue
      if (this.bundle && !this.isHumanSeat(seat)) continue
      if (this.disconnectedAt.has(occ.playerId)) continue
      ids.push(occ.playerId)
    }
    return ids
  }

  private isHumanSeat(seat: Seat): boolean {
    return this.bundle != null && this.bundle.state.players[seat].isHuman
  }

  private isDisconnectedHuman(seat: Seat): boolean {
    const occ = this.lobby.chairs[seat]
    if (!occ || this.spectators.has(occ.playerId)) return false
    return this.disconnectedAt.has(occ.playerId) && this.isHumanSeat(seat)
  }

  private isTurnPaused(): boolean {
    if (!this.bundle) return false
    const turn = whoseTurn(this.bundle)
    if (turn == null) return false
    return this.isDisconnectedHuman(turn)
  }

  private currentPaused(): PausedInfo | null {
    if (!this.bundle) return null
    if (this.pausedSeat != null && this.pausedUntil != null) {
      const occ = this.lobby.chairs[this.pausedSeat]
      if (occ && this.disconnectedAt.has(occ.playerId) && this.isHumanSeat(this.pausedSeat)) {
        return { name: occ.name, until: this.pausedUntil, seat: this.pausedSeat }
      }
    }
    for (const seat of SEATS) {
      const occ = this.lobby.chairs[seat]
      if (!occ || this.spectators.has(occ.playerId) || !this.isHumanSeat(seat)) continue
      const at = this.disconnectedAt.get(occ.playerId)
      if (at == null) continue
      return { name: occ.name, until: at + MATCH_GRACE_MS, seat }
    }
    return null
  }

  private presenceMessages(): { playerId: string; msg: ServerMessage }[] {
    const paused = this.currentPaused()
    if (!paused) {
      return this.connectedIds().map((playerId) => ({
        playerId,
        msg: { type: 'lobby', lobby: this.lobby },
      }))
    }
    const msg: ServerMessage = {
      type: 'paused',
      name: paused.name,
      until: paused.until,
      seat: paused.seat,
    }
    return this.connectedIds().map((playerId) => ({ playerId, msg }))
  }

  private replaceAvailableMessages(): { playerId: string; msg: ServerMessage }[] {
    const seat = this.replaceSeat
    if (seat == null) return []
    const name = this.seatName(seat)
    const msg: ServerMessage = { type: 'replace_available', seat, name }
    return this.connectedIds().map((playerId) => ({ playerId, msg }))
  }

  private seatName(seat: Seat): string {
    return this.lobby.chairs[seat]?.name ?? this.bundle?.state.players[seat].name ?? 'A player'
  }

  private clearPause(): void {
    this.pausedSeat = null
    this.pausedUntil = null
    this.replaceVotes = {}
    this.replaceSeat = null
  }

  private nextWakeAt(now: number): number | null {
    let soonest: number | null = this.pendingDelay?.fireAt ?? null
    const grace = this.bundle ? MATCH_GRACE_MS : LOBBY_GRACE_MS
    for (const at of this.disconnectedAt.values()) {
      const fireAt = at + grace
      if (soonest == null || fireAt < soonest) soonest = fireAt
    }
    if (this.idleSince != null) {
      const closeAt = this.idleSince + IDLE_CLOSE_MS
      if (soonest == null || closeAt < soonest) soonest = closeAt
    }
    if (soonest != null && soonest <= now) return now
    return soonest
  }

  private withWake(out: Outbox, now: number): Outbox {
    const wakeAt = this.nextWakeAt(now)
    if (wakeAt == null) return out
    const ms = Math.max(0, wakeAt - now)
    const kind: DelayKind = this.bundle
      ? this.idleSince != null
        ? 'match_disconnect'
        : this.pendingDelay?.kind === 'ai' || this.pendingDelay?.kind === 'recap'
          ? this.pendingDelay.kind
          : 'match_disconnect'
      : 'lobby_disconnect'
    return { ...out, delayMs: { kind, ms, seat: this.pausedSeat ?? this.pendingDelay?.seat } }
  }

  private err(playerId: string, code: ErrorCode, message: string, seq?: number): Outbox {
    return {
      to: [{ playerId, msg: { type: 'error', code, message, ...(seq != null ? { seq } : {}) } }],
    }
  }
}

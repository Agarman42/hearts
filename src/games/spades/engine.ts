import { AiDifficulty, Card, Seat, SEATS } from '../../core/types'
import { deal, freshShuffledDeck } from '../../core/deck'
import type { PartnershipId } from '../../core/partnership'
import { partnershipOf } from '../../core/partnership'
import { CompletedTrick, TrickPlay } from '../types'
import { DEFAULT_CHARACTER_IDS } from '../../characters'
import type { SeatPrefs, UserPrefs } from '../../prefs'
import { sortSpadesHand } from './hand'
import {
  applyTeamBagPenalties,
  scoreHand,
  summarizeHand,
  type PlayerBid,
  type SpadesLastHandSummary,
} from './scoring'
import { teamLabel } from './labels'
import { chooseBid, choosePlay } from './ai'
import { legalMoves, trickWinner } from './rules'
import { DEFAULT_SPADES_RULES, type SpadesRulesConfig } from './types'

export type SpadesPhase =
  | 'idle'
  | 'bidding'
  | 'playing'
  | 'trick_reveal'
  | 'hand_result'
  | 'game_over'

export interface SpadesPlayerState {
  seat: Seat
  name: string
  isHuman: boolean
  difficulty: AiDifficulty
  characterId: string
  hand: Card[]
  bid: number | null
  nil: boolean
  blindNil: boolean
  tricksWon: number
  /** Mirror of team score for seat display. */
  totalScore: number
}

export interface SpadesState {
  phase: SpadesPhase
  rules: SpadesRulesConfig
  players: Record<Seat, SpadesPlayerState>
  handNumber: number
  dealer: Seat
  bids: Partial<Record<Seat, PlayerBid>>
  teamScores: Record<PartnershipId, number>
  teamBags: Record<PartnershipId, number>
  spadesBroken: boolean
  currentTrick: TrickPlay[]
  trickLeader: Seat | null
  whoseTurn: Seat | null
  completedTricks: CompletedTrick[]
  lastTrick: CompletedTrick | null
  handScores: Record<PartnershipId, number> | null
  lastHandSummary: SpadesLastHandSummary | null
  winner: PartnershipId | null
  matchComplete: boolean
  message: string | null
  warning: string | null
}

function defaultSeatPrefs(): Record<Seat, SeatPrefs> {
  return {
    0: { name: 'You', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[0] },
    1: { name: 'Angie', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[1] },
    2: { name: 'Scott', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[2] },
    3: { name: 'Heather', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[3] },
  }
}

function syncTeamScoresToPlayers(
  players: Record<Seat, SpadesPlayerState>,
  teamScores: Record<PartnershipId, number>,
): Record<Seat, SpadesPlayerState> {
  const out = { ...players }
  for (const seat of SEATS) {
    const team = partnershipOf(seat)
    out[seat] = { ...out[seat], totalScore: teamScores[team] }
  }
  return out
}

export function createInitialState(
  prefs?: Pick<UserPrefs, 'seats'> & { spadesRules?: SpadesRulesConfig },
): SpadesState {
  const seats = prefs?.seats ?? defaultSeatPrefs()
  const rules = prefs?.spadesRules ?? DEFAULT_SPADES_RULES
  const players = {} as Record<Seat, SpadesPlayerState>
  for (const seat of SEATS) {
    const p = seats[seat]
    players[seat] = {
      seat,
      name: p.name,
      isHuman: seat === 0,
      difficulty: seat === 0 ? 'medium' : p.difficulty,
      characterId: p.characterId,
      hand: [],
      bid: null,
      nil: false,
      blindNil: false,
      tricksWon: 0,
      totalScore: 0,
    }
  }
  return {
    phase: 'idle',
    rules,
    players,
    handNumber: 0,
    dealer: 3,
    bids: {},
    teamScores: { ns: 0, ew: 0 },
    teamBags: { ns: 0, ew: 0 },
    spadesBroken: false,
    currentTrick: [],
    trickLeader: null,
    whoseTurn: null,
    completedTricks: [],
    lastTrick: null,
    handScores: null,
    lastHandSummary: null,
    winner: null,
    matchComplete: false,
    message: null,
    warning: null,
  }
}

export function startNewGame(state: SpadesState, prefs?: Pick<UserPrefs, 'seats'>): SpadesState {
  if (prefs) return dealHand(createInitialState(prefs))
  const seats = {} as Record<Seat, SeatPrefs>
  for (const seat of SEATS) {
    seats[seat] = {
      name: state.players[seat].name,
      difficulty: state.players[seat].difficulty,
      characterId: state.players[seat].characterId,
    }
  }
  return dealHand(createInitialState({ seats, spadesRules: state.rules }))
}

export function dealHand(state: SpadesState): SpadesState {
  const deck = freshShuffledDeck()
  const hands = deal(deck, 4)
  const dealer = ((state.dealer + 1) % 4) as Seat
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      hand: sortSpadesHand(hands[seat]),
      bid: null,
      nil: false,
      blindNil: false,
      tricksWon: 0,
    }
  }

  const firstBidder = ((dealer + 1) % 4) as Seat
  const next: SpadesState = {
    ...state,
    phase: 'bidding',
    players,
    handNumber: state.handNumber + 1,
    dealer,
    bids: {},
    spadesBroken: false,
    currentTrick: [],
    trickLeader: null,
    whoseTurn: firstBidder,
    completedTricks: [],
    lastTrick: null,
    handScores: null,
    lastHandSummary: null,
    winner: null,
    matchComplete: false,
    message: `Hand ${state.handNumber + 1} — place your bid.`,
    warning: null,
  }
  return autoAiBids(next)
}

function autoAiBids(state: SpadesState): SpadesState {
  let s = state
  while (s.phase === 'bidding' && s.whoseTurn != null) {
    const seat = s.whoseTurn
    const player = s.players[seat]
    if (player.isHuman && player.bid == null) break
    if (player.bid != null) {
      s = advanceBidTurn(s)
      continue
    }
    const pick = chooseBid(player.hand, player.difficulty, Math.random, {
      seat,
      bids: s.bids,
      teamScores: s.teamScores,
      teamBags: s.teamBags,
      rules: s.rules,
    })
    s = submitBid(s, seat, pick.bid, pick.nil)
  }
  return s
}

function advanceBidTurn(state: SpadesState): SpadesState {
  if (state.whoseTurn == null) return state
  const nextSeat = ((state.whoseTurn + 1) % 4) as Seat
  const allBid = SEATS.every((s) => state.bids[s] != null)
  if (allBid) return beginPlay(state)
  return { ...state, whoseTurn: nextSeat }
}

function beginPlay(state: SpadesState): SpadesState {
  const leader = ((state.dealer + 1) % 4) as Seat
  return {
    ...state,
    phase: 'playing',
    trickLeader: leader,
    whoseTurn: leader,
    message: `${state.players[leader].name} leads.`,
  }
}

export function submitBid(
  state: SpadesState,
  seat: Seat,
  bid: number,
  nil = false,
  blindNil = false,
): SpadesState {
  if (state.phase !== 'bidding' || state.whoseTurn !== seat) return state
  if (blindNil && !state.rules.blindNil) {
    return { ...state, warning: 'Blind nil is disabled in settings.' }
  }
  if (nil && !state.rules.nilBids && !blindNil) {
    return { ...state, warning: 'Nil bids are disabled.' }
  }
  if (!nil && (bid < 1 || bid > 13)) {
    return { ...state, warning: 'Bid must be 1–13 (or nil).' }
  }
  if (nil || blindNil) {
    nil = true
    bid = 0
  }

  const players = {
    ...state.players,
    [seat]: {
      ...state.players[seat],
      bid,
      nil,
      blindNil,
    },
  }
  const bids = {
    ...state.bids,
    [seat]: { bid, nil, blindNil: blindNil || undefined },
  }
  const bidMsg = blindNil
    ? `${players[seat].name} bids blind nil!`
    : nil
      ? `${players[seat].name} bids nil!`
      : `${players[seat].name} bids ${bid}.`
  let next: SpadesState = {
    ...state,
    players,
    bids,
    warning: bidMsg,
  }
  next = advanceBidTurn(next)
  return autoAiBids(next)
}

export function tryPlayCard(state: SpadesState, seat: Seat, card: Card): SpadesState {
  if (state.phase !== 'playing' || state.whoseTurn !== seat) return state
  const player = state.players[seat]
  const legal = legalMoves(player.hand, state.currentTrick, state.spadesBroken)
  if (!legal.some((c) => c.id === card.id)) {
    return { ...state, warning: 'That card is not a legal play.' }
  }

  const hand = player.hand.filter((c) => c.id !== card.id)
  const currentTrick = [...state.currentTrick, { seat, card }]
  const spadesBroken = state.spadesBroken || card.suit === 'spades'

  const players = {
    ...state.players,
    [seat]: { ...player, hand },
  }

  if (currentTrick.length < 4) {
    const nextSeat = ((seat + 1) % 4) as Seat
    return {
      ...state,
      players,
      currentTrick,
      spadesBroken,
      whoseTurn: nextSeat,
      warning: null,
      message: null,
    }
  }

  const winner = trickWinner(currentTrick, spadesBroken)
  const completed: CompletedTrick = {
    leader: state.trickLeader!,
    winner,
    plays: currentTrick,
    points: 0,
  }

  players[winner] = {
    ...players[winner],
    tricksWon: players[winner].tricksWon + 1,
  }

  return {
    ...state,
    players,
    completedTricks: [...state.completedTricks, completed],
    lastTrick: completed,
    currentTrick: [],
    trickLeader: winner,
    whoseTurn: winner,
    spadesBroken,
    phase: 'trick_reveal',
    warning: null,
    message: `${players[winner].name} wins the trick`,
  }
}

export function advanceAfterTrick(state: SpadesState): SpadesState {
  if (state.phase !== 'trick_reveal') return state
  if (state.players[0].hand.length === 0) return finishHand(state)
  return { ...state, phase: 'playing', message: null }
}

function finishHand(state: SpadesState): SpadesState {
  const tricksWon = {
    0: state.players[0].tricksWon,
    1: state.players[1].tricksWon,
    2: state.players[2].tricksWon,
    3: state.players[3].tricksWon,
  } as Record<Seat, number>

  const lastHandSummary = summarizeHand(
    state.bids,
    tricksWon,
    state.rules,
    state.teamScores,
    state.teamBags,
  )
  const { teamPoints, teamBagsAdded } = scoreHand(state.bids, tricksWon, state.rules)
  let teamScores = {
    ns: state.teamScores.ns + teamPoints.ns,
    ew: state.teamScores.ew + teamPoints.ew,
  }
  let teamBags = { ...state.teamBags }
  const applied = applyTeamBagPenalties(teamScores, teamBags, teamBagsAdded, state.rules)
  teamScores = applied.teamScores
  teamBags = applied.teamBags

  const players = syncTeamScoresToPlayers(state.players, teamScores)

  let winner: PartnershipId | null = null
  let matchComplete = false
  if (teamScores.ns >= state.rules.raceTo || teamScores.ew >= state.rules.raceTo) {
    matchComplete = true
    if (teamScores.ns >= state.rules.raceTo && teamScores.ew >= state.rules.raceTo) {
      winner = teamScores.ns >= teamScores.ew ? 'ns' : 'ew'
    } else if (teamScores.ns >= state.rules.raceTo) {
      winner = 'ns'
    } else {
      winner = 'ew'
    }
  }

  return {
    ...state,
    players,
    teamScores,
    teamBags,
    phase: 'hand_result',
    handScores: teamPoints,
    lastHandSummary,
    winner,
    matchComplete,
    whoseTurn: null,
    message: `${teamLabel('ns')} ${teamPoints.ns >= 0 ? '+' : ''}${teamPoints.ns} · ${teamLabel('ew')} ${teamPoints.ew >= 0 ? '+' : ''}${teamPoints.ew}`,
  }
}

export function nextHand(state: SpadesState): SpadesState {
  if (state.phase !== 'hand_result') return state
  return dealHand(state)
}

export function showMatchResults(state: SpadesState): SpadesState {
  if (state.phase !== 'hand_result' || !state.matchComplete) return state
  const label = state.winner != null ? teamLabel(state.winner) : 'Match'
  return {
    ...state,
    phase: 'game_over',
    message: `${label} wins the match!`,
  }
}

export function runAiTurn(state: SpadesState): SpadesState {
  if (state.phase === 'bidding' && state.whoseTurn != null) {
    const seat = state.whoseTurn
    const player = state.players[seat]
    if (player.isHuman) return state
    const pick = chooseBid(player.hand, player.difficulty, Math.random, {
      seat,
      bids: state.bids,
      teamScores: state.teamScores,
      teamBags: state.teamBags,
      rules: state.rules,
    })
    return submitBid(state, seat, pick.bid, pick.nil)
  }
  if (state.phase !== 'playing' || state.whoseTurn === null) return state
  const seat = state.whoseTurn
  const player = state.players[seat]
  if (player.isHuman) return state
  const card = choosePlay(
    player.hand,
    state.currentTrick,
    state.spadesBroken,
    player.difficulty,
    Math.random,
    seat,
    {
      seat,
      bids: state.bids,
      tricksWon: {
        0: state.players[0].tricksWon,
        1: state.players[1].tricksWon,
        2: state.players[2].tricksWon,
        3: state.players[3].tricksWon,
      },
      teamBags: state.teamBags,
      rules: state.rules,
    },
  )
  return tryPlayCard(state, seat, card)
}

export function getLegalForHuman(state: SpadesState, seat: Seat = 0): Card[] {
  if (state.phase !== 'playing' || state.whoseTurn !== seat) return []
  return legalMoves(state.players[seat].hand, state.currentTrick, state.spadesBroken)
}

export { isSpadesInProgress } from '../inProgress'

export function clearWarning(state: SpadesState): SpadesState {
  return { ...state, warning: null }
}

export function setSpadesRules(
  state: SpadesState,
  rules: Partial<SpadesRulesConfig>,
): SpadesState {
  return { ...state, rules: { ...state.rules, ...rules } }
}

/** Repair saved / legacy states so UI and hooks never see missing rules or fields. */
export function normalizeSpadesState(
  state: SpadesState,
  spadesRules?: SpadesRulesConfig,
): SpadesState {
  const base = createInitialState()
  const rules: SpadesRulesConfig = {
    ...base.rules,
    ...(state.rules ?? {}),
    ...(spadesRules ?? {}),
  }

  const players = { ...base.players }
  for (const seat of SEATS) {
    const saved = state.players?.[seat]
    players[seat] = {
      ...base.players[seat],
      ...(saved ?? {}),
      blindNil: saved?.blindNil ?? false,
      hand: sortSpadesHand(saved?.hand ?? []),
    }
  }

  return {
    ...base,
    ...state,
    rules,
    players,
    bids: state.bids ?? {},
    teamBags: {
      ns: state.teamBags?.ns ?? 0,
      ew: state.teamBags?.ew ?? 0,
    },
    teamScores: {
      ns: state.teamScores?.ns ?? 0,
      ew: state.teamScores?.ew ?? 0,
    },
    spadesBroken: state.spadesBroken ?? false,
    currentTrick: state.currentTrick ?? [],
    completedTricks: state.completedTricks ?? [],
    lastHandSummary: state.lastHandSummary ?? null,
    lastTrick: state.lastTrick ?? null,
    handScores: state.handScores ?? null,
    winner: state.winner ?? null,
    matchComplete: state.matchComplete ?? false,
  }
}

export function hydrateSpadesFromPrefs(
  state: SpadesState,
  prefs: Pick<UserPrefs, 'seats' | 'spadesRules'>,
): SpadesState {
  return normalizeSpadesState(applyIdentityFromPrefs(state, prefs.seats), prefs.spadesRules)
}

export function applyIdentityFromPrefs(
  state: SpadesState,
  seats: Record<Seat, SeatPrefs>,
): SpadesState {
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      name: seats[seat].name,
      characterId: seats[seat].characterId,
      difficulty: seat === 0 ? players[seat].difficulty : seats[seat].difficulty,
    }
  }
  return { ...state, players }
}

export function setDifficulty(
  state: SpadesState,
  seat: Seat,
  difficulty: AiDifficulty,
): SpadesState {
  if (seat === 0) return state
  return {
    ...state,
    players: {
      ...state.players,
      [seat]: { ...state.players[seat], difficulty },
    },
  }
}

export function setPlayerName(state: SpadesState, seat: Seat, name: string): SpadesState {
  const trimmed = name.trim().slice(0, 16) || state.players[seat].name
  return {
    ...state,
    players: {
      ...state.players,
      [seat]: { ...state.players[seat], name: trimmed },
    },
  }
}

export function setPlayerCharacter(
  state: SpadesState,
  seat: Seat,
  characterId: string,
): SpadesState {
  return {
    ...state,
    players: {
      ...state.players,
      [seat]: { ...state.players[seat], characterId },
    },
  }
}
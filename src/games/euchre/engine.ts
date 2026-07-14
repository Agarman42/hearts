import { AiDifficulty, Card, Seat, SEATS } from '../../core/types'
import type { Suit } from '../../core/types'
import { deal, freshShuffledDeck } from '../../core/deck'
import type { PartnershipId } from '../../core/partnership'
import { partnershipOf } from '../../core/partnership'
import { CompletedTrick, TrickPlay } from '../types'
import { DEFAULT_CHARACTER_IDS } from '../../characters'
import type { SeatPrefs, UserPrefs } from '../../prefs'
import { sortEuchreHand } from './hand'
import { teamLabel } from './labels'
import {
  chooseDiscard,
  chooseOrderUp,
  choosePlay,
  chooseTrumpSuit,
} from './ai'
import { legalMoves, trickWinner } from './rules'
import { checkMatchWinner, scoreHand } from './scoring'
import { DEFAULT_EUCHRE_RULES, type EuchreRulesConfig } from './types'

export type EuchrePhase =
  | 'idle'
  | 'bidding'
  | 'discard'
  | 'playing'
  | 'trick_reveal'
  | 'hand_result'
  | 'game_over'

export interface EuchrePlayerState {
  seat: Seat
  name: string
  isHuman: boolean
  difficulty: AiDifficulty
  characterId: string
  hand: Card[]
  tricksWon: number
  totalScore: number
}

export interface EuchreLastHandSummary {
  makerTeam: PartnershipId
  makerTricks: number
  marched: boolean
  euchred: boolean
  points: Record<PartnershipId, number>
  matchTotals: Record<PartnershipId, number>
}

export interface EuchreState {
  phase: EuchrePhase
  rules: EuchreRulesConfig
  players: Record<Seat, EuchrePlayerState>
  handNumber: number
  dealer: Seat
  upcard: Card | null
  turnedDownSuit: Suit | null
  biddingRound: 1 | 2
  passedThisRound: Seat[]
  trump: Suit | null
  maker: Seat | null
  makerTeam: PartnershipId | null
  teamScores: Record<PartnershipId, number>
  currentTrick: TrickPlay[]
  trickLeader: Seat | null
  whoseTurn: Seat | null
  completedTricks: CompletedTrick[]
  lastTrick: CompletedTrick | null
  handPoints: Record<PartnershipId, number> | null
  lastHandSummary: EuchreLastHandSummary | null
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

function syncScores(players: Record<Seat, EuchrePlayerState>, scores: Record<PartnershipId, number>) {
  const out = { ...players }
  for (const seat of SEATS) {
    out[seat] = { ...out[seat], totalScore: scores[partnershipOf(seat)] }
  }
  return out
}

function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat
}

export function createInitialState(
  prefs?: Pick<UserPrefs, 'seats'> & { euchreRules?: EuchreRulesConfig },
): EuchreState {
  const seats = prefs?.seats ?? defaultSeatPrefs()
  const rules = prefs?.euchreRules ?? DEFAULT_EUCHRE_RULES
  const players = {} as Record<Seat, EuchrePlayerState>
  for (const seat of SEATS) {
    const p = seats[seat]
    players[seat] = {
      seat,
      name: p.name,
      isHuman: seat === 0,
      difficulty: seat === 0 ? 'medium' : p.difficulty,
      characterId: p.characterId,
      hand: [],
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
    upcard: null,
    turnedDownSuit: null,
    biddingRound: 1,
    passedThisRound: [],
    trump: null,
    maker: null,
    makerTeam: null,
    teamScores: { ns: 0, ew: 0 },
    currentTrick: [],
    trickLeader: null,
    whoseTurn: null,
    completedTricks: [],
    lastTrick: null,
    handPoints: null,
    lastHandSummary: null,
    winner: null,
    matchComplete: false,
    message: null,
    warning: null,
  }
}

export function startNewGame(state: EuchreState, prefs?: Pick<UserPrefs, 'seats'>): EuchreState {
  if (prefs) return dealHand(createInitialState(prefs))
  const seats = {} as Record<Seat, SeatPrefs>
  for (const seat of SEATS) {
    seats[seat] = {
      name: state.players[seat].name,
      difficulty: state.players[seat].difficulty,
      characterId: state.players[seat].characterId,
    }
  }
  return dealHand(createInitialState({ seats, euchreRules: state.rules }))
}

export function dealHand(state: EuchreState): EuchreState {
  const deck = freshShuffledDeck(undefined, 'euchre24')
  const hands = deal(deck, 4)
  const dealer = ((state.dealer + 1) % 4) as Seat
  const upcard = deck[20] ?? null
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      hand: sortEuchreHand(hands[seat].slice(0, 5), null),
      tricksWon: 0,
    }
  }
  const firstBidder = nextSeat(dealer)
  return {
    ...state,
    phase: 'bidding',
    players,
    handNumber: state.handNumber + 1,
    dealer,
    upcard,
    turnedDownSuit: null,
    biddingRound: 1,
    passedThisRound: [],
    trump: null,
    maker: null,
    makerTeam: null,
    currentTrick: [],
    trickLeader: null,
    whoseTurn: firstBidder,
    completedTricks: [],
    lastTrick: null,
    handPoints: null,
    lastHandSummary: null,
    winner: null,
    matchComplete: false,
    message: `Hand ${state.handNumber + 1} — ${state.players[firstBidder].name} bids first.`,
    warning: null,
  }
}

function beginPlay(state: EuchreState): EuchreState {
  const leader = nextSeat(state.dealer)
  const trump = state.trump!
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      hand: sortEuchreHand(players[seat].hand, trump),
    }
  }
  return {
    ...state,
    phase: 'playing',
    players,
    trickLeader: leader,
    whoseTurn: leader,
    message: `${players[leader].name} leads.`,
    warning: null,
  }
}

function afterOrderUp(state: EuchreState, maker: Seat): EuchreState {
  const trump = state.upcard!.suit
  const dealer = state.dealer
  const players = { ...state.players }
  players[dealer] = {
    ...players[dealer],
    hand: sortEuchreHand([...players[dealer].hand, state.upcard!], trump),
  }
  return {
    ...state,
    trump,
    maker,
    makerTeam: partnershipOf(maker),
    players,
    phase: 'discard',
    whoseTurn: dealer,
    message: `${players[dealer].name} picks up the ${trump} — discard one.`,
    warning: `${state.players[maker].name} ordered up ${trump}.`,
  }
}

function afterNameTrump(state: EuchreState, maker: Seat, suit: Suit): EuchreState {
  return beginPlay({
    ...state,
    trump: suit,
    maker,
    makerTeam: partnershipOf(maker),
    warning: `${state.players[maker].name} calls ${suit} trump.`,
  })
}

function allPassed(state: EuchreState): boolean {
  return state.passedThisRound.length >= 4
}

function advanceBiddingAfterAllPass(state: EuchreState): EuchreState {
  if (state.biddingRound === 1) {
    const turnedDownSuit = state.upcard?.suit ?? null
    const first = nextSeat(state.dealer)
    return {
      ...state,
      biddingRound: 2,
      turnedDownSuit,
      passedThisRound: [],
      whoseTurn: first,
      message: 'Round 2 — name trump or pass.',
      warning: null,
    }
  }

  if (state.rules.stickTheDealer) {
    const dealer = state.dealer
    const player = state.players[dealer]
    const suit =
      chooseTrumpSuit(player.hand, state.turnedDownSuit, player.difficulty) ??
      (['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).find(
        (s) => s !== state.turnedDownSuit,
      )!
    return afterNameTrump(
      {
        ...state,
        warning: `${player.name} must name trump (stick the dealer).`,
      },
      dealer,
      suit,
    )
  }
  return dealHand({ ...state, dealer: state.dealer })
}

function nextBidder(state: EuchreState, from: Seat): Seat {
  let seat = nextSeat(from)
  while (state.passedThisRound.includes(seat)) seat = nextSeat(seat)
  return seat
}

export function passBid(state: EuchreState, seat: Seat): EuchreState {
  if (state.phase !== 'bidding' || state.whoseTurn !== seat) return state
  const passed = [...state.passedThisRound, seat]
  const next = {
    ...state,
    passedThisRound: passed,
    warning: `${state.players[seat].name} passes.`,
  }
  if (allPassed(next)) return advanceBiddingAfterAllPass(next)
  return { ...next, whoseTurn: nextBidder(next, seat) }
}

export function orderUp(state: EuchreState, seat: Seat): EuchreState {
  if (state.phase !== 'bidding' || state.biddingRound !== 1 || state.whoseTurn !== seat) {
    return state
  }
  return afterOrderUp(state, seat)
}

export function nameTrump(state: EuchreState, seat: Seat, suit: Suit): EuchreState {
  if (state.phase !== 'bidding' || state.biddingRound !== 2 || state.whoseTurn !== seat) {
    return state
  }
  if (suit === state.turnedDownSuit) {
    return { ...state, warning: 'That suit was turned down.' }
  }
  return afterNameTrump(state, seat, suit)
}

export function discardCard(state: EuchreState, seat: Seat, card: Card): EuchreState {
  if (state.phase !== 'discard' || state.whoseTurn !== seat || seat !== state.dealer) {
    return state
  }
  const player = state.players[seat]
  if (!player.hand.some((c) => c.id === card.id)) {
    return { ...state, warning: 'Pick a card from your hand.' }
  }
  const hand = player.hand.filter((c) => c.id !== card.id)
  const players = {
    ...state.players,
    [seat]: { ...player, hand: sortEuchreHand(hand, state.trump!) },
  }
  return beginPlay({ ...state, players, upcard: null })
}

export function tryPlayCard(state: EuchreState, seat: Seat, card: Card): EuchreState {
  if (state.phase !== 'playing' || state.whoseTurn !== seat || state.trump == null) return state
  const player = state.players[seat]
  const legal = legalMoves(player.hand, state.currentTrick, state.trump)
  if (!legal.some((c) => c.id === card.id)) {
    return { ...state, warning: 'That card is not a legal play.' }
  }

  const hand = player.hand.filter((c) => c.id !== card.id)
  const currentTrick = [...state.currentTrick, { seat, card }]
  const players = { ...state.players, [seat]: { ...player, hand } }

  if (currentTrick.length < 4) {
    return {
      ...state,
      players,
      currentTrick,
      whoseTurn: nextSeat(seat),
      warning: null,
      message: null,
    }
  }

  const winner = trickWinner(currentTrick, state.trump)
  const completed: CompletedTrick = {
    leader: state.trickLeader!,
    winner,
    plays: currentTrick,
    points: 0,
  }
  players[winner] = { ...players[winner], tricksWon: players[winner].tricksWon + 1 }

  return {
    ...state,
    players,
    completedTricks: [...state.completedTricks, completed],
    lastTrick: completed,
    currentTrick: [],
    trickLeader: winner,
    whoseTurn: winner,
    phase: 'trick_reveal',
    warning: null,
    message: `${players[winner].name} wins the trick`,
  }
}

export function advanceAfterTrick(state: EuchreState): EuchreState {
  if (state.phase !== 'trick_reveal') return state
  if (state.players[0].hand.length === 0) return finishHand(state)
  return { ...state, phase: 'playing', message: null }
}

function finishHand(state: EuchreState): EuchreState {
  const makerTeam = state.makerTeam!
  const makerTricks =
    state.players[makerTeam === 'ns' ? 0 : 1].tricksWon +
    state.players[makerTeam === 'ns' ? 2 : 3].tricksWon
  const result = scoreHand(makerTeam, makerTricks, state.rules)
  const teamScores = {
    ns: state.teamScores.ns + result.points.ns,
    ew: state.teamScores.ew + result.points.ew,
  }
  const players = syncScores(state.players, teamScores)
  const winner = checkMatchWinner(teamScores, state.rules.raceTo)
  const matchComplete = winner != null
  const summary: EuchreLastHandSummary = {
    makerTeam,
    makerTricks,
    marched: result.marched,
    euchred: result.euchred,
    points: result.points,
    matchTotals: teamScores,
  }

  const detail = result.euchred
    ? `${teamLabel(makerTeam === 'ns' ? 'ew' : 'ns')} euchre!`
    : result.marched
      ? `${teamLabel(makerTeam)} march!`
      : `${teamLabel(makerTeam)} ${result.points[makerTeam]} pt`

  return {
    ...state,
    players,
    teamScores,
    phase: 'hand_result',
    handPoints: result.points,
    lastHandSummary: summary,
    winner,
    matchComplete,
    whoseTurn: null,
    message: detail,
  }
}

export function nextHand(state: EuchreState): EuchreState {
  if (state.phase !== 'hand_result') return state
  return dealHand(state)
}

export function showMatchResults(state: EuchreState): EuchreState {
  if (state.phase !== 'hand_result' || !state.matchComplete) return state
  const label = state.winner != null ? teamLabel(state.winner) : 'Match'
  return { ...state, phase: 'game_over', message: `${label} wins the match!` }
}

export function runAiTurn(state: EuchreState): EuchreState {
  if (state.whoseTurn == null) return state
  const seat = state.whoseTurn
  const player = state.players[seat]
  if (player.isHuman) return state

  if (state.phase === 'bidding') {
    if (state.biddingRound === 1 && state.upcard) {
      if (chooseOrderUp(player.hand, state.upcard.suit, player.difficulty)) {
        return orderUp(state, seat)
      }
      return passBid(state, seat)
    }
    if (state.biddingRound === 2) {
      const suit = chooseTrumpSuit(player.hand, state.turnedDownSuit, player.difficulty)
      if (suit) return nameTrump(state, seat, suit)
      return passBid(state, seat)
    }
  }

  if (state.phase === 'discard' && seat === state.dealer && state.trump) {
    return discardCard(state, seat, chooseDiscard(player.hand, state.trump))
  }

  if (state.phase === 'playing' && state.trump) {
    const card = choosePlay(
      player.hand,
      state.currentTrick,
      state.trump,
      player.difficulty,
      Math.random,
      seat,
    )
    return tryPlayCard(state, seat, card)
  }

  return state
}

export function getLegalForHuman(state: EuchreState): Card[] {
  if (state.phase === 'discard' && state.whoseTurn === 0) {
    return [...state.players[0].hand]
  }
  if (state.phase !== 'playing' || state.whoseTurn !== 0 || state.trump == null) return []
  return legalMoves(state.players[0].hand, state.currentTrick, state.trump)
}

export function clearWarning(state: EuchreState): EuchreState {
  return { ...state, warning: null }
}

export function setPlayerName(state: EuchreState, seat: Seat, name: string): EuchreState {
  return { ...state, players: { ...state.players, [seat]: { ...state.players[seat], name } } }
}

export function setDifficulty(state: EuchreState, seat: Seat, difficulty: AiDifficulty): EuchreState {
  return {
    ...state,
    players: { ...state.players, [seat]: { ...state.players[seat], difficulty } },
  }
}

export function setPlayerCharacter(
  state: EuchreState,
  seat: Seat,
  characterId: string,
): EuchreState {
  return {
    ...state,
    players: { ...state.players, [seat]: { ...state.players[seat], characterId } },
  }
}

export function setEuchreRules(
  state: EuchreState,
  patch: Partial<EuchreRulesConfig>,
): EuchreState {
  return { ...state, rules: { ...state.rules, ...patch } }
}

export { isEuchreInProgress } from '../inProgress'
import { AiDifficulty, Card, Seat, SEATS, SUIT_SYMBOL } from '../../core/types'
import type { Suit } from '../../core/types'
import { dealEuchre, freshShuffledDeck } from '../../core/deck'
import type { PartnershipId } from '../../core/partnership'
import { partnerOf, partnershipOf } from '../../core/partnership'
import { CompletedTrick, TrickPlay } from '../types'
import { DEFAULT_CHARACTER_IDS } from '../../characters'
import type { SeatPrefs, UserPrefs } from '../../prefs'
import { sortEuchreHand } from './hand'
import { teamLabel } from './labels'
import {
  chooseDiscard,
  chooseGoAlone,
  chooseOrderUp,
  choosePlay,
  chooseTrumpSuit,
} from './ai'
import { dealersPartnerMustOrder, legalMoves, trickWinner } from './rules'
import { checkMatchWinner, scoreHand } from './scoring'
import { DEFAULT_EUCHRE_RULES, type EuchreRulesConfig } from './types'

export type EuchrePhase =
  | 'idle'
  | 'bidding'
  | 'discard'
  | 'loner_choice'
  | 'playing'
  | 'trick_reveal'
  | 'hand_result'
  | 'game_over'

/** How trump was set — shown in the trump-call recap overlay. */
export type TrumpCallMethod = 'order_up' | 'name_suit'

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
  loner: boolean
  points: Record<PartnershipId, number>
  matchTotals: Record<PartnershipId, number>
}

export interface EuchreState {
  phase: EuchrePhase
  rules: EuchreRulesConfig
  players: Record<Seat, EuchrePlayerState>
  handNumber: number
  dealer: Seat
  /** Four-card kitty; top card is face-up as `upcard` during round 1 bidding. */
  kitty: Card[]
  upcard: Card | null
  /** Kitty card the dealer picked up on order-up — shown until they discard. */
  pickedUpCard: Card | null
  turnedDownSuit: Suit | null
  biddingRound: 1 | 2
  passedThisRound: Seat[]
  trump: Suit | null
  maker: Seat | null
  makerTeam: PartnershipId | null
  loner: boolean
  sittingOut: Seat | null
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
  /** Pause AI/human flow until the trump-call recap is acknowledged. */
  awaitingTrumpAck: boolean
  trumpCallMethod: TrumpCallMethod | null
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

function dealersPartnerSeat(dealer: Seat): Seat {
  return nextSeat(dealer)
}

function nextActiveSeat(state: EuchreState, from: Seat): Seat {
  let seat = nextSeat(from)
  while (state.loner && state.sittingOut != null && seat === state.sittingOut) {
    seat = nextSeat(seat)
  }
  return seat
}

function trickTarget(state: EuchreState): number {
  return state.loner ? 3 : 4
}

function handIsComplete(state: EuchreState): boolean {
  return state.completedTricks.length >= 5
}

function offerLonerChoice(state: EuchreState): EuchreState {
  const maker = state.maker!
  return {
    ...state,
    phase: 'loner_choice',
    whoseTurn: maker,
    message: `${state.players[maker].name} — go alone?`,
    warning: null,
  }
}

function startPlayAfterBid(state: EuchreState): EuchreState {
  if (state.rules.lonersEnabled && state.maker != null) {
    return offerLonerChoice(state)
  }
  return beginPlay({ ...state, loner: false, sittingOut: null })
}

/** Repair saved / legacy states so hooks and UI never see missing fields. */
export function normalizeEuchreState(state: EuchreState): EuchreState {
  const base = createInitialState()
  const rules = { ...base.rules, ...(state.rules ?? {}) }
  const trump = state.trump ?? null
  const players = { ...base.players }
  for (const seat of SEATS) {
    const saved = state.players?.[seat]
    players[seat] = {
      ...base.players[seat],
      ...(saved ?? {}),
      hand: sortEuchreHand(saved?.hand ?? [], trump),
    }
  }
  const kitty = state.kitty?.length ? state.kitty : state.upcard ? [state.upcard] : []
  return {
    ...base,
    ...state,
    rules,
    players,
    kitty,
    upcard: state.upcard ?? null,
    pickedUpCard: state.pickedUpCard ?? null,
    turnedDownSuit: state.turnedDownSuit ?? null,
    biddingRound: state.biddingRound === 2 ? 2 : 1,
    passedThisRound: state.passedThisRound ?? [],
    trump,
    maker: state.maker ?? null,
    makerTeam: state.makerTeam ?? null,
    loner: state.loner ?? false,
    sittingOut: state.sittingOut ?? null,
    teamScores: {
      ns: state.teamScores?.ns ?? 0,
      ew: state.teamScores?.ew ?? 0,
    },
    currentTrick: state.currentTrick ?? [],
    trickLeader: state.trickLeader ?? null,
    whoseTurn: state.whoseTurn ?? null,
    completedTricks: state.completedTricks ?? [],
    lastTrick: state.lastTrick ?? null,
    handPoints: state.handPoints ?? null,
    lastHandSummary: state.lastHandSummary ?? null,
    winner: state.winner ?? null,
    matchComplete: state.matchComplete ?? false,
    awaitingTrumpAck: state.awaitingTrumpAck ?? false,
    trumpCallMethod: state.trumpCallMethod ?? null,
  }
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
    kitty: [],
    upcard: null,
    pickedUpCard: null,
    turnedDownSuit: null,
    biddingRound: 1,
    passedThisRound: [],
    trump: null,
    maker: null,
    makerTeam: null,
    loner: false,
    sittingOut: null,
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
    awaitingTrumpAck: false,
    trumpCallMethod: null,
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
  const { hands, kitty } = dealEuchre(deck)
  const dealer = ((state.dealer + 1) % 4) as Seat
  const upcard = kitty[kitty.length - 1] ?? null
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      hand: sortEuchreHand(hands[seat], null),
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
    kitty,
    upcard,
    pickedUpCard: null,
    turnedDownSuit: null,
    biddingRound: 1,
    passedThisRound: [],
    trump: null,
    maker: null,
    makerTeam: null,
    loner: false,
    sittingOut: null,
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
    awaitingTrumpAck: false,
    trumpCallMethod: null,
  }
}

function beginPlay(state: EuchreState): EuchreState {
  const leader = nextActiveSeat(state, state.dealer)
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
    kitty: [],
    upcard: null,
    trickLeader: leader,
    whoseTurn: leader,
    message: state.loner
      ? `${players[leader].name} leads — ${state.players[state.maker!].name} is alone.`
      : `${players[leader].name} leads.`,
    warning: null,
  }
}

function afterOrderUp(state: EuchreState, maker: Seat): EuchreState {
  const pickedUp = state.upcard!
  const trump = pickedUp.suit
  const trumpSym = SUIT_SYMBOL[trump]
  const dealer = state.dealer
  const makerName = state.players[maker].name
  const players = { ...state.players }
  players[dealer] = {
    ...players[dealer],
    hand: sortEuchreHand([...players[dealer].hand, pickedUp], trump),
  }
  const kitty = state.kitty.filter((c) => c.id !== pickedUp.id)
  const dealerName = players[dealer].name
  const isHumanDealer = players[dealer].isHuman
  return {
    ...state,
    trump,
    maker,
    makerTeam: partnershipOf(maker),
    players,
    kitty,
    upcard: null,
    pickedUpCard: pickedUp,
    phase: 'discard',
    whoseTurn: dealer,
    message: isHumanDealer
      ? `${makerName} ordered ${trumpSym} trump — you picked up the kitty card (highlighted). Discard one.`
      : `${dealerName} picks up the kitty card — discarding one.`,
    warning: `${makerName} ordered ${trumpSym} trump.`,
    awaitingTrumpAck: true,
    trumpCallMethod: 'order_up',
  }
}

function afterNameTrump(state: EuchreState, maker: Seat, suit: Suit): EuchreState {
  const trumpSym = SUIT_SYMBOL[suit]
  const makerName = state.players[maker].name
  return startPlayAfterBid({
    ...state,
    trump: suit,
    maker,
    makerTeam: partnershipOf(maker),
    warning: `${makerName} calls ${trumpSym} trump.`,
    awaitingTrumpAck: true,
    trumpCallMethod: 'name_suit',
  })
}

export function ackTrumpCall(state: EuchreState): EuchreState {
  if (!state.awaitingTrumpAck) return state
  return { ...state, awaitingTrumpAck: false, trumpCallMethod: null }
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
      upcard: null,
      passedThisRound: [],
      whoseTurn: first,
      message: 'Round 2 — name trump or pass (upcard turned down).',
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
    let next = afterNameTrump(
      {
        ...state,
        warning: `${player.name} must name trump (stick the dealer).`,
      },
      dealer,
      suit,
    )
    if (state.rules.screwTheDealer && state.rules.lonersEnabled) {
      next = declareLoner(next, dealer, true)
    }
    return next
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
  if (seat === dealersPartnerSeat(state.dealer)) {
    const hand = state.players[seat].hand
    if (dealersPartnerMustOrder(hand, state.rules)) {
      return {
        ...state,
        warning: state.rules.farmersHand
          ? 'Farmers hand — you must order (no face cards).'
          : 'Dealer’s partner must order — no passing.',
      }
    }
  }
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
  return startPlayAfterBid({
    ...state,
    players,
    upcard: null,
    pickedUpCard: null,
    kitty: state.kitty,
  })
}

export function declareLoner(state: EuchreState, seat: Seat, alone: boolean): EuchreState {
  if (state.phase !== 'loner_choice' || state.whoseTurn !== seat || state.maker !== seat) {
    return state
  }
  const sittingOut = alone ? partnerOf(seat) : null
  return beginPlay({
    ...state,
    loner: alone,
    sittingOut,
    warning: alone
      ? `${state.players[seat].name} goes alone!`
      : `${state.players[seat].name} plays with partner.`,
  })
}

export function goAlone(state: EuchreState, seat: Seat): EuchreState {
  return declareLoner(state, seat, true)
}

export function withPartner(state: EuchreState, seat: Seat): EuchreState {
  return declareLoner(state, seat, false)
}

export function tryPlayCard(state: EuchreState, seat: Seat, card: Card): EuchreState {
  if (state.phase !== 'playing' || state.whoseTurn !== seat || state.trump == null) return state
  if (state.loner && seat === state.sittingOut) return state
  const player = state.players[seat]
  const legal = legalMoves(player.hand, state.currentTrick, state.trump)
  if (!legal.some((c) => c.id === card.id)) {
    return { ...state, warning: 'That card is not a legal play.' }
  }

  const hand = player.hand.filter((c) => c.id !== card.id)
  const currentTrick = [...state.currentTrick, { seat, card }]
  const players = { ...state.players, [seat]: { ...player, hand } }

  if (currentTrick.length < trickTarget(state)) {
    return {
      ...state,
      players,
      currentTrick,
      whoseTurn: nextActiveSeat(state, seat),
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
  if (handIsComplete(state)) return finishHand(state)
  return { ...state, phase: 'playing', message: null }
}

function finishHand(state: EuchreState): EuchreState {
  const makerTeam = state.makerTeam!
  const makerSeat = state.maker!
  const makerTricks = state.loner
    ? state.players[makerSeat].tricksWon
    : state.players[makerTeam === 'ns' ? 0 : 1].tricksWon +
      state.players[makerTeam === 'ns' ? 2 : 3].tricksWon
  const result = scoreHand(makerTeam, makerTricks, state.rules, state.loner)
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
    loner: result.loner,
    points: result.points,
    matchTotals: teamScores,
  }

  const detail = result.euchred
    ? `${teamLabel(makerTeam === 'ns' ? 'ew' : 'ns')} euchre!`
    : result.marched
      ? state.loner
        ? `${teamLabel(makerTeam)} loner march (+4)!`
        : `${teamLabel(makerTeam)} march!`
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
  if (state.awaitingTrumpAck) return state
  if (state.whoseTurn == null) return state
  const seat = state.whoseTurn
  const player = state.players[seat]
  if (player.isHuman) return state

  if (state.phase === 'bidding') {
    if (state.biddingRound === 1 && state.upcard) {
      const mustOrder =
        seat === dealersPartnerSeat(state.dealer) &&
        dealersPartnerMustOrder(player.hand, state.rules)
      if (
        mustOrder ||
        chooseOrderUp(
          player.hand,
          state.upcard.suit,
          player.difficulty,
          Math.random,
          state.upcard,
          seat === state.dealer,
        )
      ) {
        return orderUp(state, seat)
      }
      return passBid(state, seat)
    }
    if (state.biddingRound === 2) {
      const mustOrder =
        seat === dealersPartnerSeat(state.dealer) &&
        dealersPartnerMustOrder(player.hand, state.rules)
      const suit =
        chooseTrumpSuit(player.hand, state.turnedDownSuit, player.difficulty) ??
        (mustOrder
          ? (['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).find(
              (s) => s !== state.turnedDownSuit,
            ) ?? null
          : null)
      if (suit) return nameTrump(state, seat, suit)
      if (mustOrder) {
        const fallback = (['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).find(
          (s) => s !== state.turnedDownSuit,
        )
        if (fallback) return nameTrump(state, seat, fallback)
      }
      return passBid(state, seat)
    }
  }

  if (state.phase === 'discard' && seat === state.dealer && state.trump) {
    return discardCard(state, seat, chooseDiscard(player.hand, state.trump))
  }

  if (state.phase === 'loner_choice' && seat === state.maker && state.trump) {
    const alone = chooseGoAlone(player.hand, state.trump, player.difficulty)
    return declareLoner(state, seat, alone)
  }

  if (state.phase === 'playing' && state.trump) {
    const card = choosePlay(
      player.hand,
      state.currentTrick,
      state.trump,
      player.difficulty,
      Math.random,
      seat,
      {
        seat,
        maker: state.maker,
        trump: state.trump,
        makerTeam: state.makerTeam,
        loner: state.loner,
        tricksWon: {
          0: state.players[0].tricksWon,
          1: state.players[1].tricksWon,
          2: state.players[2].tricksWon,
          3: state.players[3].tricksWon,
        },
      },
    )
    return tryPlayCard(state, seat, card)
  }

  return state
}

export function getLegalForHuman(state: EuchreState, seat: Seat = 0): Card[] {
  if (state.phase === 'discard' && state.whoseTurn === seat) {
    return [...state.players[seat].hand]
  }
  if (state.phase !== 'playing' || state.whoseTurn !== seat || state.trump == null) return []
  return legalMoves(state.players[seat].hand, state.currentTrick, state.trump)
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
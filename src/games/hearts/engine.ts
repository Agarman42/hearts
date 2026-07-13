import { AiDifficulty, Card, Seat, SEATS } from '../../core/types'
import { isHeart, isQueenOfSpades, sortHand } from '../../core/cards'
import { deal, freshShuffledDeck } from '../../core/deck'
import {
  CompletedTrick,
  DEFAULT_HEARTS_RULES,
  GameRulesConfig,
  PassDirection,
  TrickPlay,
} from '../types'
import {
  applyMoonScoring,
  findTwoOfClubs,
  illegalReason,
  isLegalPlay,
  legalMoves,
  passSource,
  trickPoints,
  trickWinner,
} from './rules'
import { choosePassCards, choosePlay } from './ai'
import type { SeatPrefs, UserPrefs } from '../../prefs'
import { DEFAULT_CHARACTER_IDS } from '../../characters'

export type Phase =
  | 'idle'
  | 'passing'
  /** Human is reviewing the 3 cards they just received before they join the hand. */
  | 'receiving'
  | 'playing'
  | 'trick_reveal'
  | 'hand_result'
  | 'game_over'

export interface HeartsPlayerState {
  seat: Seat
  name: string
  isHuman: boolean
  difficulty: AiDifficulty
  characterId: string
  hand: Card[]
  totalScore: number
  /** Combined penalty points this hand (hearts + Q♠). */
  handPoints: number
  /** Hearts taken this hand (0–13). */
  handHearts: number
  /** True if this player has taken the Queen of Spades this hand. */
  hasQueen: boolean
  selectedPass: Card[]
}

export interface HeartsState {
  phase: Phase
  rules: GameRulesConfig
  players: Record<Seat, HeartsPlayerState>
  handNumber: number
  passDirection: PassDirection
  passSelections: Partial<Record<Seat, Card[]>>
  /** Cards the human just received — shown in the pass tray until accepted. */
  receivedCards: Card[]
  currentTrick: TrickPlay[]
  trickLeader: Seat | null
  heartsBroken: boolean
  isFirstTrick: boolean
  completedTricks: CompletedTrick[]
  lastTrick: CompletedTrick | null
  whoseTurn: Seat | null
  message: string | null
  warning: string | null
  moonShooter: Seat | null
  handScores: Record<Seat, number> | null
  winner: Seat | null
  /** True when someone crossed raceTo — hand_result shows last hand before standings. */
  matchComplete: boolean
  animating: boolean
  /** True when all 26 penalty points are already taken and hand is racing out. */
  racingOut: boolean
}

const PASS_CYCLE: PassDirection[] = ['left', 'right', 'across', 'hold']

function defaultSeatPrefs(): Record<Seat, SeatPrefs> {
  return {
    0: { name: 'You', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[0] },
    1: { name: 'Angie', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[1] },
    2: { name: 'Scott', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[2] },
    3: { name: 'Heather', difficulty: 'medium', characterId: DEFAULT_CHARACTER_IDS[3] },
  }
}

export function createInitialState(
  prefs?: Pick<UserPrefs, 'seats' | 'rules'>,
): HeartsState {
  const seats = prefs?.seats ?? defaultSeatPrefs()
  const rules = prefs?.rules ?? DEFAULT_HEARTS_RULES
  const players = {} as Record<Seat, HeartsPlayerState>
  for (const seat of SEATS) {
    const p = seats[seat]
    players[seat] = {
      seat,
      name: p.name,
      isHuman: seat === 0,
      difficulty: seat === 0 ? 'medium' : p.difficulty,
      characterId: p.characterId,
      hand: [],
      totalScore: 0,
      handPoints: 0,
      handHearts: 0,
      hasQueen: false,
      selectedPass: [],
    }
  }
  return {
    phase: 'idle',
    rules,
    players,
    handNumber: 0,
    passDirection: 'left',
    passSelections: {},
    receivedCards: [],
    currentTrick: [],
    trickLeader: null,
    heartsBroken: false,
    isFirstTrick: true,
    completedTricks: [],
    lastTrick: null,
    whoseTurn: null,
    message: null,
    warning: null,
    moonShooter: null,
    handScores: null,
    winner: null,
    matchComplete: false,
    animating: false,
    racingOut: false,
  }
}

/** Sync live player identity from prefs without wiping scores/hands mid-hand carelessly. */
export function applyIdentityFromPrefs(
  state: HeartsState,
  seats: Record<Seat, SeatPrefs>,
): HeartsState {
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

export function startNewGame(state: HeartsState, prefs?: Pick<UserPrefs, 'seats' | 'rules'>): HeartsState {
  if (prefs) {
    return dealHand(createInitialState(prefs))
  }
  // Preserve current identities + rules
  const seats = {} as Record<Seat, SeatPrefs>
  for (const seat of SEATS) {
    seats[seat] = {
      name: state.players[seat].name,
      difficulty: state.players[seat].difficulty,
      characterId: state.players[seat].characterId,
    }
  }
  return dealHand(createInitialState({ seats, rules: state.rules }))
}

export function dealHand(state: HeartsState): HeartsState {
  const deck = freshShuffledDeck()
  const hands = deal(deck, 4)
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      hand: sortHand(hands[seat]),
      handPoints: 0,
      handHearts: 0,
      hasQueen: false,
      selectedPass: [],
    }
  }

  const handNumber = state.handNumber + 1
  const passDirection = PASS_CYCLE[(handNumber - 1) % 4]
  const next: HeartsState = {
    ...state,
    phase: passDirection === 'hold' ? 'playing' : 'passing',
    players,
    handNumber,
    passDirection,
    passSelections: {},
    receivedCards: [],
    currentTrick: [],
    trickLeader: null,
    heartsBroken: false,
    isFirstTrick: true,
    completedTricks: [],
    lastTrick: null,
    whoseTurn: null,
    message:
      passDirection === 'hold'
        ? 'No pass this hand — 2♣ leads.'
        : `Pass 3 cards ${passDirection}.`,
    warning: null,
    moonShooter: null,
    handScores: null,
    winner: null,
    matchComplete: false,
    animating: false,
    racingOut: false,
  }

  if (passDirection === 'hold') {
    return beginPlay(next)
  }

  return autoAiPass(next)
}

function autoAiPass(state: HeartsState): HeartsState {
  const passSelections = { ...state.passSelections }
  const players = { ...state.players }
  for (const seat of SEATS) {
    if (players[seat].isHuman) continue
    const picks = choosePassCards(players[seat].hand, players[seat].difficulty)
    passSelections[seat] = picks
    players[seat] = { ...players[seat], selectedPass: picks }
  }
  return { ...state, passSelections, players }
}

export function togglePassCard(state: HeartsState, card: Card): HeartsState {
  if (state.phase !== 'passing' || !state.players[0].isHuman) return state
  const human = state.players[0]
  const selected = [...human.selectedPass]
  const idx = selected.findIndex((c) => c.id === card.id)
  if (idx >= 0) {
    selected.splice(idx, 1)
  } else {
    if (selected.length >= state.rules.passCount) {
      return {
        ...state,
        warning: `Select exactly ${state.rules.passCount} cards to pass.`,
      }
    }
    if (!human.hand.some((c) => c.id === card.id)) return state
    selected.push(card)
  }
  return {
    ...state,
    warning: null,
    players: {
      ...state.players,
      0: { ...human, selectedPass: selected },
    },
    passSelections: { ...state.passSelections, 0: selected },
  }
}

/**
 * Exchange all pass cards. AI get their new cards immediately.
 * Human keeps their remaining hand and reviews `receivedCards` in the tray
 * until they accept them into the hand.
 */
export function confirmPass(state: HeartsState): HeartsState {
  if (state.phase !== 'passing') return state
  const need = state.rules.passCount
  const humanSel = state.players[0].selectedPass
  if (humanSel.length !== need) {
    return {
      ...state,
      warning: `Select ${need} cards to pass (you have ${humanSel.length}).`,
    }
  }

  let s = autoAiPass(state)
  const selections: Record<Seat, Card[]> = {
    0: s.players[0].selectedPass,
    1: s.passSelections[1]!,
    2: s.passSelections[2]!,
    3: s.passSelections[3]!,
  }

  const dir = s.passDirection as 'left' | 'right' | 'across'
  const players = { ...s.players }
  let humanReceived: Card[] = []

  for (const seat of SEATS) {
    const passing = new Set(selections[seat].map((c) => c.id))
    const kept = s.players[seat].hand.filter((c) => !passing.has(c.id))
    const from = passSource(seat, dir)
    const received = selections[from]

    if (players[seat].isHuman) {
      humanReceived = received
      // Hand is only the kept cards until the player accepts the receive tray
      players[seat] = {
        ...players[seat],
        hand: sortHand(kept),
        selectedPass: [],
      }
    } else {
      players[seat] = {
        ...players[seat],
        hand: sortHand([...kept, ...received]),
        selectedPass: [],
      }
    }
  }

  const fromSeat = passSource(0, dir)
  const fromName = players[fromSeat].name
  const dirWord = dir === 'left' ? 'left' : dir === 'right' ? 'right' : 'across'

  return {
    ...s,
    players,
    phase: 'receiving',
    passSelections: {},
    receivedCards: humanReceived,
    message: `You passed ${dirWord}; received 3 from ${fromName}`,
    warning: null,
  }
}

/** Fold the receive tray into the human hand and start the hand. */
export function acceptReceived(state: HeartsState): HeartsState {
  if (state.phase !== 'receiving') return state
  const human = state.players[0]
  const merged = sortHand([...human.hand, ...state.receivedCards])
  return beginPlay({
    ...state,
    players: {
      ...state.players,
      0: { ...human, hand: merged, selectedPass: [] },
    },
    phase: 'playing',
    receivedCards: [],
    message: 'Cards passed. 2♣ leads.',
    warning: null,
  })
}

function beginPlay(state: HeartsState): HeartsState {
  const hands: Record<Seat, Card[]> = {
    0: state.players[0].hand,
    1: state.players[1].hand,
    2: state.players[2].hand,
    3: state.players[3].hand,
  }
  const leader = findTwoOfClubs(hands) ?? 0
  return {
    ...state,
    phase: 'playing',
    receivedCards: [],
    trickLeader: leader,
    whoseTurn: leader,
    currentTrick: [],
    isFirstTrick: true,
    heartsBroken: false,
    racingOut: false,
  }
}

export function pointsTakenThisHand(state: HeartsState): number {
  let sum = 0
  for (const s of SEATS) sum += state.players[s].handPoints
  return sum
}

export function tryPlayCard(state: HeartsState, seat: Seat, card: Card): HeartsState {
  if (state.phase !== 'playing' || state.whoseTurn !== seat || state.animating) {
    return state
  }
  const player = state.players[seat]
  const reason = illegalReason(
    card,
    player.hand,
    state.currentTrick,
    state.heartsBroken,
    state.isFirstTrick,
    state.rules,
  )
  if (reason) {
    return { ...state, warning: reason }
  }
  if (
    !isLegalPlay(
      card,
      player.hand,
      state.currentTrick,
      state.heartsBroken,
      state.isFirstTrick,
      state.rules,
    )
  ) {
    return { ...state, warning: 'Illegal play.' }
  }

  const hand = player.hand.filter((c) => c.id !== card.id)
  const currentTrick = [...state.currentTrick, { seat, card }]
  const heartsBroken = state.heartsBroken || isHeart(card)

  const players = {
    ...state.players,
    [seat]: { ...player, hand },
  }

  let next: HeartsState = {
    ...state,
    players,
    currentTrick,
    heartsBroken,
    warning: null,
    message: null,
  }

  if (currentTrick.length < 4) {
    const nextSeat = ((seat + 1) % 4) as Seat
    return { ...next, whoseTurn: nextSeat }
  }

  const winner = trickWinner(currentTrick)
  const points = trickPoints(currentTrick)
  const completed: CompletedTrick = {
    leader: state.trickLeader!,
    winner,
    plays: currentTrick,
    points,
  }

  const heartsInTrick = currentTrick.filter((p) => isHeart(p.card)).length
  const queenInTrick = currentTrick.some((p) => isQueenOfSpades(p.card))
  players[winner] = {
    ...players[winner],
    handPoints: players[winner].handPoints + points,
    handHearts: players[winner].handHearts + heartsInTrick,
    hasQueen: players[winner].hasQueen || queenInTrick,
  }

  let totalPts = 0
  for (const s of SEATS) totalPts += players[s].handPoints
  const racingOut = totalPts >= 26

  // Always enter trick_reveal so the 4th card (including the last of the hand) is visible.
  // Hand scoring happens in advanceAfterTrick after the collect animation.
  return {
    ...next,
    players,
    completedTricks: [...state.completedTricks, completed],
    lastTrick: completed,
    currentTrick: [],
    trickLeader: winner,
    whoseTurn: winner,
    isFirstTrick: false,
    phase: 'trick_reveal',
    racingOut,
    message: racingOut
      ? 'All points out — finishing hand…'
      : points > 0
        ? `${players[winner].name} takes ${points} pt${points === 1 ? '' : 's'}`
        : `${players[winner].name} wins the trick`,
  }
}

export function advanceAfterTrick(state: HeartsState): HeartsState {
  if (state.phase !== 'trick_reveal') return state
  // Last trick of the hand: finish after the reveal, not before
  if (state.players[0].hand.length === 0) {
    return finishHand(state)
  }
  return {
    ...state,
    phase: 'playing',
    message: state.racingOut ? 'Finishing hand…' : null,
  }
}

function finishHand(state: HeartsState): HeartsState {
  const raw: Record<Seat, number> = {
    0: state.players[0].handPoints,
    1: state.players[1].handPoints,
    2: state.players[2].handPoints,
    3: state.players[3].handPoints,
  }
  const { scores, moonShooter } = applyMoonScoring(raw, state.rules.shootTheMoon)

  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      totalScore: players[seat].totalScore + scores[seat],
      // Keep breakdown for the result screen; totals absorbed into totalScore
      handPoints: scores[seat],
    }
  }

  const totals = SEATS.map((s) => players[s].totalScore)
  const max = Math.max(...totals)
  let winner: Seat | null = null
  let phase: Phase = 'hand_result'

  let matchComplete = false
  if (max >= state.rules.raceTo) {
    const min = Math.min(...totals)
    winner = SEATS.find((s) => players[s].totalScore === min) ?? 0
    matchComplete = true
  }

  return {
    ...state,
    players,
    phase,
    handScores: scores,
    moonShooter,
    winner,
    matchComplete,
    whoseTurn: null,
    racingOut: false,
    message:
      moonShooter !== null
        ? `🌙 ${players[moonShooter].name} shot the moon!`
        : 'Hand complete',
  }
}

export function nextHand(state: HeartsState): HeartsState {
  if (state.phase !== 'hand_result') return state
  return dealHand(state)
}

/** After the final hand summary, show match standings. */
export function showMatchResults(state: HeartsState): HeartsState {
  if (state.phase !== 'hand_result' || !state.matchComplete) return state
  return {
    ...state,
    phase: 'game_over',
    message: state.winner != null ? `${state.players[state.winner].name} wins the match` : 'Match over',
  }
}

/** Drive AI turns (or any auto seat during race-out). */
export function runAiTurn(state: HeartsState): HeartsState {
  if (state.phase !== 'playing' || state.whoseTurn === null) return state
  const seat = state.whoseTurn
  const player = state.players[seat]
  if (player.isHuman) return state

  const card = choosePlay(
    player.hand,
    state.currentTrick,
    state.heartsBroken,
    state.isFirstTrick,
    state.rules,
    player.difficulty,
    Math.random,
    aiContext(state, seat),
  )
  return tryPlayCard(state, seat, card)
}

/** Auto-play for the current seat (AI or human) — used when racing out a finished points hand. */
export function runAutoTurn(state: HeartsState): HeartsState {
  if (state.phase !== 'playing' || state.whoseTurn === null) return state
  const seat = state.whoseTurn
  const player = state.players[seat]
  const card = choosePlay(
    player.hand,
    state.currentTrick,
    state.heartsBroken,
    state.isFirstTrick,
    state.rules,
    player.isHuman ? 'medium' : player.difficulty,
    Math.random,
    aiContext(state, seat),
  )
  return tryPlayCard(state, seat, card)
}

function aiContext(state: HeartsState, seat: Seat) {
  const myPoints = state.players[seat].handPoints
  let maxOpp = 0
  let heartsTaken = 0
  let leaderTotal = 0
  let myTotal = state.players[seat].totalScore
  for (const s of SEATS) {
    heartsTaken += state.players[s].handHearts
    if (s !== seat) maxOpp = Math.max(maxOpp, state.players[s].handPoints)
    leaderTotal = Math.max(leaderTotal, state.players[s].totalScore)
  }
  const handPointsBySeat: Partial<Record<Seat, number>> = {}
  const totalScores: Partial<Record<Seat, number>> = {}
  for (const s of SEATS) {
    handPointsBySeat[s] = state.players[s].handPoints
    totalScores[s] = state.players[s].totalScore
  }
  const suitsSeen: Partial<Record<Seat, Set<string>>> = {}
  for (const trick of state.completedTricks) {
    for (const play of trick.plays) {
      ;(suitsSeen[play.seat] ||= new Set()).add(play.card.suit)
    }
  }
  return {
    myPoints,
    maxOppPoints: maxOpp,
    heartsLeftInPlay: Math.max(0, 13 - heartsTaken),
    handPointsBySeat,
    totalScores,
    leaderTotal,
    myTotal,
    raceTo: state.rules.raceTo,
    trickLeader: state.trickLeader,
    completedTricks: state.completedTricks.length,
    suitsSeenBySeat: suitsSeen,
    seat,
  }
}

export function getLegalForHuman(state: HeartsState): Card[] {
  if (state.phase !== 'playing' || state.whoseTurn !== 0) return []
  return legalMoves(
    state.players[0].hand,
    state.currentTrick,
    state.heartsBroken,
    state.isFirstTrick,
    state.rules,
  )
}

export function setDifficulty(
  state: HeartsState,
  seat: Seat,
  difficulty: AiDifficulty,
): HeartsState {
  if (seat === 0) return state
  return {
    ...state,
    players: {
      ...state.players,
      [seat]: { ...state.players[seat], difficulty },
    },
  }
}

export function setPlayerName(state: HeartsState, seat: Seat, name: string): HeartsState {
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
  state: HeartsState,
  seat: Seat,
  characterId: string,
): HeartsState {
  return {
    ...state,
    players: {
      ...state.players,
      [seat]: { ...state.players[seat], characterId },
    },
  }
}

export function setRules(state: HeartsState, rules: Partial<GameRulesConfig>): HeartsState {
  return { ...state, rules: { ...state.rules, ...rules } }
}

export function clearWarning(state: HeartsState): HeartsState {
  return { ...state, warning: null }
}

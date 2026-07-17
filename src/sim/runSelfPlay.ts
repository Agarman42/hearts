/**
 * Headless AI self-play for development only.
 * Not used by the app UI — run via `npm run sim`.
 */
import type { AiDifficulty, Seat } from '../core/types'
import type { PartnershipId } from '../core/partnership'
import {
  ackDiscardComplete,
  ackLonerChoice,
  ackTrumpCall,
  advanceAfterTrick as advanceEuchreTrick,
  createInitialState as createEuchreState,
  dealHand as dealEuchre,
  nextHand as nextEuchreHand,
  runAiTurn as runEuchreAi,
  showMatchResults as showEuchreResults,
  type EuchreState,
} from '../games/euchre/engine'
import {
  advanceAfterTrick as advanceSpadesTrick,
  createInitialState as createSpadesState,
  dealHand as dealSpades,
  nextHand as nextSpadesHand,
  runAiTurn as runSpadesAi,
  showMatchResults as showSpadesResults,
  type SpadesState,
} from '../games/spades/engine'
import {
  ackPassComplete,
  advanceAfterTrick as advanceHeartsTrick,
  completeAllAiPass,
  createInitialState as createHeartsState,
  dealHand as dealHearts,
  nextHand as nextHeartsHand,
  runAiTurn as runHeartsAi,
  showMatchResults as showHeartsResults,
  type HeartsState,
} from '../games/hearts/engine'
import { DEFAULT_CHARACTER_IDS } from '../characters'
import type { SeatPrefs } from '../prefs'
import { DEFAULT_HEARTS_RULES } from '../games/hearts/types'

export type SimGame = 'euchre' | 'spades' | 'hearts'

export interface SelfPlayOptions {
  game: SimGame
  /** Number of full matches (race-to finish). */
  matches: number
  /** Partnership games: NS difficulty (seats 0 & 2). */
  ns?: AiDifficulty
  /** Partnership games: EW difficulty (seats 1 & 3). */
  ew?: AiDifficulty
  /** Hearts: difficulty for all four seats. */
  difficulty?: AiDifficulty
  /** Safety cap per match (steps). */
  maxStepsPerMatch?: number
}

export interface PartnershipReport {
  game: 'euchre' | 'spades'
  matches: number
  nsWins: number
  ewWins: number
  draws: number
  nsDifficulty: AiDifficulty
  ewDifficulty: AiDifficulty
  avgHandsPerMatch: number
  aborted: number
}

export interface HeartsReport {
  game: 'hearts'
  matches: number
  seatWins: Record<Seat, number>
  difficulty: AiDifficulty
  avgHandsPerMatch: number
  aborted: number
}

export type SelfPlayReport = PartnershipReport | HeartsReport

const SEATS: Seat[] = [0, 1, 2, 3]

function seatPrefs(ns: AiDifficulty, ew: AiDifficulty): Record<Seat, SeatPrefs> {
  const names = ['North-S', 'East-W', 'South-S', 'West-W']
  return {
    0: { name: names[0], difficulty: ns, characterId: DEFAULT_CHARACTER_IDS[0] },
    1: { name: names[1], difficulty: ew, characterId: DEFAULT_CHARACTER_IDS[1] },
    2: { name: names[2], difficulty: ns, characterId: DEFAULT_CHARACTER_IDS[2] },
    3: { name: names[3], difficulty: ew, characterId: DEFAULT_CHARACTER_IDS[3] },
  }
}

function allAiSeats(difficulty: AiDifficulty): Record<Seat, SeatPrefs> {
  const names = ['AI-0', 'AI-1', 'AI-2', 'AI-3']
  return {
    0: { name: names[0], difficulty, characterId: DEFAULT_CHARACTER_IDS[0] },
    1: { name: names[1], difficulty, characterId: DEFAULT_CHARACTER_IDS[1] },
    2: { name: names[2], difficulty, characterId: DEFAULT_CHARACTER_IDS[2] },
    3: { name: names[3], difficulty, characterId: DEFAULT_CHARACTER_IDS[3] },
  }
}

function forceAllAiEuchre(state: EuchreState, ns: AiDifficulty, ew: AiDifficulty): EuchreState {
  const players = { ...state.players }
  for (const seat of SEATS) {
    const d = seat === 0 || seat === 2 ? ns : ew
    players[seat] = {
      ...players[seat],
      isHuman: false,
      difficulty: d,
      name: seat === 0 || seat === 2 ? `NS-${seat}` : `EW-${seat}`,
    }
  }
  return { ...state, players }
}

function forceAllAiSpades(state: SpadesState, ns: AiDifficulty, ew: AiDifficulty): SpadesState {
  const players = { ...state.players }
  for (const seat of SEATS) {
    const d = seat === 0 || seat === 2 ? ns : ew
    players[seat] = {
      ...players[seat],
      isHuman: false,
      difficulty: d,
      name: seat === 0 || seat === 2 ? `NS-${seat}` : `EW-${seat}`,
    }
  }
  return { ...state, players }
}

function forceAllAiHearts(state: HeartsState, difficulty: AiDifficulty): HeartsState {
  const players = { ...state.players }
  for (const seat of SEATS) {
    players[seat] = {
      ...players[seat],
      isHuman: false,
      difficulty,
      name: `AI-${seat}`,
    }
  }
  return { ...state, players }
}

function stepEuchre(state: EuchreState): EuchreState {
  if (state.awaitingTrumpAck) return ackTrumpCall(state)
  if (state.awaitingDiscardAck) return ackDiscardComplete(state)
  if (state.awaitingLonerAck) return ackLonerChoice(state)
  if (state.phase === 'trick_reveal') return advanceEuchreTrick(state)
  if (state.phase === 'hand_result') {
    if (state.matchComplete) return showEuchreResults(state)
    return nextEuchreHand(state)
  }
  if (
    state.phase === 'bidding' ||
    state.phase === 'discard' ||
    state.phase === 'loner_choice' ||
    state.phase === 'playing'
  ) {
    return runEuchreAi(state)
  }
  return state
}

function stepSpades(state: SpadesState): SpadesState {
  if (state.phase === 'trick_reveal') return advanceSpadesTrick(state)
  if (state.phase === 'hand_result') {
    if (state.matchComplete) return showSpadesResults(state)
    return nextSpadesHand(state)
  }
  if (state.phase === 'bidding' || state.phase === 'playing') {
    return runSpadesAi(state)
  }
  return state
}

function stepHearts(state: HeartsState): HeartsState {
  if (state.awaitingPassAck) return ackPassComplete(state)
  if (state.phase === 'passing') return completeAllAiPass(state)
  if (state.phase === 'trick_reveal') return advanceHeartsTrick(state)
  if (state.phase === 'hand_result') {
    if (state.matchComplete) return showHeartsResults(state)
    return nextHeartsHand(state)
  }
  if (state.phase === 'playing') return runHeartsAi(state)
  // receiving should not happen for all-AI after completeAllAiPass
  if (state.phase === 'receiving') {
    return completeAllAiPass({ ...state, phase: 'passing' })
  }
  return state
}

function runEuchreMatch(
  ns: AiDifficulty,
  ew: AiDifficulty,
  maxSteps: number,
): { winner: PartnershipId | null; hands: number; aborted: boolean } {
  let state = forceAllAiEuchre(dealEuchre(createEuchreState({ seats: seatPrefs(ns, ew) })), ns, ew)
  let hands = 0
  let prevHand = state.handNumber
  for (let i = 0; i < maxSteps; i++) {
    if (state.phase === 'game_over') {
      return { winner: state.winner, hands, aborted: false }
    }
    const next = stepEuchre(state)
    if (next === state) {
      // stalled
      return { winner: null, hands, aborted: true }
    }
    if (next.handNumber > prevHand) {
      hands += 1
      prevHand = next.handNumber
    }
    state = next
  }
  return { winner: null, hands, aborted: true }
}

function runSpadesMatch(
  ns: AiDifficulty,
  ew: AiDifficulty,
  maxSteps: number,
): { winner: PartnershipId | null; hands: number; aborted: boolean } {
  let state = forceAllAiSpades(dealSpades(createSpadesState({ seats: seatPrefs(ns, ew) })), ns, ew)
  let hands = 0
  let prevHand = state.handNumber
  for (let i = 0; i < maxSteps; i++) {
    if (state.phase === 'game_over') {
      return { winner: state.winner, hands, aborted: false }
    }
    const next = stepSpades(state)
    if (next === state) {
      return { winner: null, hands, aborted: true }
    }
    if (next.handNumber > prevHand) {
      hands += 1
      prevHand = next.handNumber
    }
    state = next
  }
  return { winner: null, hands, aborted: true }
}

function runHeartsMatch(
  difficulty: AiDifficulty,
  maxSteps: number,
): { winner: Seat | null; hands: number; aborted: boolean } {
  let state = forceAllAiHearts(
    dealHearts(
      createHeartsState({ seats: allAiSeats(difficulty), rules: DEFAULT_HEARTS_RULES }),
    ),
    difficulty,
  )
  let hands = 0
  let prevHand = state.handNumber
  for (let i = 0; i < maxSteps; i++) {
    if (state.phase === 'game_over') {
      return { winner: state.winner, hands, aborted: false }
    }
    const next = stepHearts(state)
    if (next === state) {
      return { winner: null, hands, aborted: true }
    }
    if (next.handNumber > prevHand) {
      hands += 1
      prevHand = next.handNumber
    }
    state = next
  }
  return { winner: null, hands, aborted: true }
}

export function runSelfPlay(opts: SelfPlayOptions): SelfPlayReport {
  const matches = Math.max(1, Math.min(opts.matches, 5000))
  const maxSteps = opts.maxStepsPerMatch ?? 50_000

  if (opts.game === 'euchre' || opts.game === 'spades') {
    const ns = opts.ns ?? 'hard'
    const ew = opts.ew ?? 'hard'
    let nsWins = 0
    let ewWins = 0
    let draws = 0
    let aborted = 0
    let handSum = 0
    for (let m = 0; m < matches; m++) {
      const r =
        opts.game === 'euchre'
          ? runEuchreMatch(ns, ew, maxSteps)
          : runSpadesMatch(ns, ew, maxSteps)
      handSum += r.hands
      if (r.aborted) aborted += 1
      else if (r.winner === 'ns') nsWins += 1
      else if (r.winner === 'ew') ewWins += 1
      else draws += 1
    }
    return {
      game: opts.game,
      matches,
      nsWins,
      ewWins,
      draws,
      nsDifficulty: ns,
      ewDifficulty: ew,
      avgHandsPerMatch: handSum / matches,
      aborted,
    }
  }

  const difficulty = opts.difficulty ?? 'hard'
  const seatWins: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  let aborted = 0
  let handSum = 0
  for (let m = 0; m < matches; m++) {
    const r = runHeartsMatch(difficulty, maxSteps)
    handSum += r.hands
    if (r.aborted || r.winner == null) aborted += 1
    else seatWins[r.winner] += 1
  }
  return {
    game: 'hearts',
    matches,
    seatWins,
    difficulty,
    avgHandsPerMatch: handSum / matches,
    aborted,
  }
}

export function formatSelfPlayReport(report: SelfPlayReport): string {
  const lines: string[] = []
  lines.push(`=== Self-play: ${report.game} (${report.matches} matches) ===`)
  if (report.game === 'hearts') {
    lines.push(`Difficulty: ${report.difficulty} (all seats)`)
    for (const s of SEATS) {
      const w = report.seatWins[s]
      const pct = ((100 * w) / report.matches).toFixed(1)
      lines.push(`  Seat ${s}: ${w} wins (${pct}%)`)
    }
  } else {
    lines.push(`NS (${report.nsDifficulty}) vs EW (${report.ewDifficulty})`)
    const nsPct = ((100 * report.nsWins) / report.matches).toFixed(1)
    const ewPct = ((100 * report.ewWins) / report.matches).toFixed(1)
    lines.push(`  NS wins: ${report.nsWins} (${nsPct}%)`)
    lines.push(`  EW wins: ${report.ewWins} (${ewPct}%)`)
    if (report.draws) lines.push(`  Draws/ties: ${report.draws}`)
  }
  lines.push(`  Avg hands/match: ${report.avgHandsPerMatch.toFixed(1)}`)
  if (report.aborted) lines.push(`  Aborted (stalled): ${report.aborted}`)
  return lines.join('\n')
}

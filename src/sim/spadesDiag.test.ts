/**
 * Dev diagnostics: Spades hand-level stats for hard vs medium.
 *   SELFPLAY=1 npx vitest run src/sim/spadesDiag.test.ts
 */
import { describe, expect, it } from 'vitest'
import type { AiDifficulty, Seat } from '../core/types'
import { DEFAULT_CHARACTER_IDS } from '../characters'
import {
  advanceAfterTrick,
  createInitialState,
  dealHand,
  nextHand,
  runAiTurn,
  showMatchResults,
  type SpadesState,
} from '../games/spades/engine'
import { teamContractBid } from '../games/spades/scoring'

const enabled = process.env.SELFPLAY === '1'
const SEATS: Seat[] = [0, 1, 2, 3]

function force(state: SpadesState, ns: AiDifficulty, ew: AiDifficulty): SpadesState {
  const players = { ...state.players }
  for (const seat of SEATS) {
    const d = seat === 0 || seat === 2 ? ns : ew
    players[seat] = { ...players[seat], isHuman: false, difficulty: d }
  }
  return { ...state, players }
}

function prefs(ns: AiDifficulty, ew: AiDifficulty) {
  return {
    0: { name: 'N', difficulty: ns, characterId: DEFAULT_CHARACTER_IDS[0] },
    1: { name: 'E', difficulty: ew, characterId: DEFAULT_CHARACTER_IDS[1] },
    2: { name: 'S', difficulty: ns, characterId: DEFAULT_CHARACTER_IDS[2] },
    3: { name: 'W', difficulty: ew, characterId: DEFAULT_CHARACTER_IDS[3] },
  }
}

function step(state: SpadesState): SpadesState {
  if (state.phase === 'trick_reveal') return advanceAfterTrick(state)
  if (state.phase === 'hand_result') {
    if (state.matchComplete) return showMatchResults(state)
    return nextHand(state)
  }
  if (state.phase === 'bidding' || state.phase === 'playing') return runAiTurn(state)
  return state
}

type Stats = {
  hands: number
  sets: number
  made: number
  bidSum: number
  tricksSum: number
  bagsSum: number
  nils: number
  nilFail: number
  pointsSum: number
  bagPenalties: number
}

function empty(): Stats {
  return {
    hands: 0,
    sets: 0,
    made: 0,
    bidSum: 0,
    tricksSum: 0,
    bagsSum: 0,
    nils: 0,
    nilFail: 0,
    pointsSum: 0,
    bagPenalties: 0,
  }
}

function run(ns: AiDifficulty, ew: AiDifficulty, matches: number) {
  const byTeam: Record<'ns' | 'ew', Stats> = { ns: empty(), ew: empty() }
  let nsWins = 0
  let ewWins = 0
  for (let m = 0; m < matches; m++) {
    let state = force(dealHand(createInitialState({ seats: prefs(ns, ew) })), ns, ew)
    let prevScores = { ...state.teamScores }
    let prevBags = { ...state.teamBags }
    for (let i = 0; i < 50_000; i++) {
      if (state.phase === 'game_over') {
        if (state.winner === 'ns') nsWins += 1
        else if (state.winner === 'ew') ewWins += 1
        break
      }
      const next = step(state)
      if (next === state) break
      if (state.phase !== 'hand_result' && next.phase === 'hand_result') {
        for (const team of ['ns', 'ew'] as const) {
          const st = byTeam[team]
          st.hands += 1
          const bid = teamContractBid(team, state.bids)
          const tricks =
            team === 'ns'
              ? state.players[0].tricksWon + state.players[2].tricksWon
              : state.players[1].tricksWon + state.players[3].tricksWon
          st.bidSum += bid
          st.tricksSum += tricks
          if (bid > 0) {
            if (tricks >= bid) {
              st.made += 1
              st.bagsSum += tricks - bid
            } else st.sets += 1
          }
          st.pointsSum += next.teamScores[team] - prevScores[team]
          if (next.teamBags[team] < prevBags[team]) st.bagPenalties += 1
          const seats = team === 'ns' ? ([0, 2] as const) : ([1, 3] as const)
          for (const s of seats) {
            if (state.bids[s]?.nil) {
              st.nils += 1
              if ((state.players[s].tricksWon ?? 0) > 0) st.nilFail += 1
            }
          }
        }
        prevScores = { ...next.teamScores }
        prevBags = { ...next.teamBags }
      }
      state = next
    }
  }
  return { nsWins, ewWins, byTeam }
}

function fmt(label: string, r: ReturnType<typeof run>) {
  const lines = [`=== ${label} ===`, `Match wins NS ${r.nsWins} EW ${r.ewWins}`]
  for (const team of ['ns', 'ew'] as const) {
    const s = r.byTeam[team]
    const n = s.hands || 1
    lines.push(
      `${team}: hands=${s.hands} set=${(s.sets / n).toFixed(3)} make=${(s.made / n).toFixed(3)} ` +
        `avgBid=${(s.bidSum / n).toFixed(2)} avgTricks=${(s.tricksSum / n).toFixed(2)} ` +
        `avgBags=${(s.bagsSum / n).toFixed(2)} avgPts=${(s.pointsSum / n).toFixed(1)} ` +
        `nils=${s.nils} nilFail=${s.nilFail} bagPens=${s.bagPenalties}`,
    )
  }
  return lines.join('\n')
}

describe.skipIf(!enabled)('spades hard/medium diagnostics', () => {
  it('reports hand stats', () => {
    console.log('\n' + fmt('hard NS vs medium EW', run('hard', 'medium', 80)))
    console.log('\n' + fmt('medium NS vs hard EW', run('medium', 'hard', 80)))
    console.log('\n' + fmt('hard vs hard', run('hard', 'hard', 40)))
    console.log('\n' + fmt('medium vs medium', run('medium', 'medium', 40)))
    expect(true).toBe(true)
  }, 300_000)
})

import { describe, expect, it } from 'vitest'
import {
  advanceAfterTrick,
  createInitialState,
  dealHand,
  getLegalForHuman,
  isSpadesInProgress,
  startNewGame,
  normalizeSpadesState,
  submitBid,
  tryPlayCard,
} from './engine'
import { legalMoves } from './rules'
import { scoreHand, summarizeHand } from './scoring'

describe('createInitialState', () => {
  it('starts idle with zeroed team scores', () => {
    const s = createInitialState()
    expect(s.phase).toBe('idle')
    expect(s.teamScores).toEqual({ ns: 0, ew: 0 })
    expect(s.players[0].isHuman).toBe(true)
  })
})

describe('dealHand', () => {
  it('deals 13 cards and enters bidding', () => {
    const s = dealHand(createInitialState())
    expect(s.phase).toBe('bidding')
    expect(s.players[0].hand).toHaveLength(13)
    expect(s.handNumber).toBe(1)
    expect(s.whoseTurn).not.toBeNull()
  })
})

describe('bidding', () => {
  it('records human bid and auto-fills AI', () => {
    let s = dealHand(createInitialState())
    while (s.phase === 'bidding' && s.whoseTurn !== 0) {
      s = submitBid(s, s.whoseTurn!, 3)
    }
    s = submitBid(s, 0, 4)
    expect(s.phase).toBe('playing')
    expect(s.bids[0]).toEqual({ bid: 4, nil: false })
    expect(Object.keys(s.bids)).toHaveLength(4)
  })
})

describe('play', () => {
  it('plays a full trick and enters trick_reveal', () => {
    let s = startNewGame(createInitialState())
    while (s.phase === 'bidding') {
      const seat = s.whoseTurn!
      s = submitBid(s, seat, s.players[seat].isHuman ? 4 : 3)
    }
    for (let i = 0; i < 4; i++) {
      const seat = s.whoseTurn!
      const card = legalMoves(s.players[seat].hand, s.currentTrick, s.spadesBroken)[0]
      s = tryPlayCard(s, seat, card)
    }
    expect(s.phase).toBe('trick_reveal')
    expect(s.completedTricks).toHaveLength(1)
  })

  it('returns legal moves only on human turn', () => {
    let s = startNewGame(createInitialState())
    while (s.phase === 'bidding') {
      const seat = s.whoseTurn!
      s = submitBid(s, seat, 3)
    }
    if (s.whoseTurn !== 0) {
      expect(getLegalForHuman(s)).toEqual([])
    } else {
      expect(getLegalForHuman(s).length).toBeGreaterThan(0)
    }
  })
})

describe('advanceAfterTrick', () => {
  it('returns to playing when cards remain', () => {
    let s = startNewGame(createInitialState())
    while (s.phase === 'bidding') {
      s = submitBid(s, s.whoseTurn!, 3)
    }
    for (let i = 0; i < 4; i++) {
      const seat = s.whoseTurn!
      const card = legalMoves(s.players[seat].hand, s.currentTrick, s.spadesBroken)[0]
      s = tryPlayCard(s, seat, card)
    }
    s = advanceAfterTrick(s)
    expect(s.phase).toBe('playing')
  })
})

describe('scoreHand', () => {
  it('awards bid points and bags for made contract', () => {
    const bids = {
      0: { bid: 4, nil: false },
      1: { bid: 3, nil: false },
      2: { bid: 4, nil: false },
      3: { bid: 3, nil: false },
    }
    const tricks = { 0: 5, 1: 2, 2: 4, 3: 2 }
    const r = scoreHand(bids, tricks, createInitialState().rules)
    expect(r.teamPoints.ns).toBe(81)
    expect(r.teamPoints.ew).toBe(-60)
    expect(r.teamBagsAdded.ns).toBe(1)
  })

  it('penalizes failed bid', () => {
    const bids = {
      0: { bid: 6, nil: false },
      1: { bid: 2, nil: false },
      2: { bid: 5, nil: false },
      3: { bid: 2, nil: false },
    }
    const tricks = { 0: 2, 1: 1, 2: 2, 3: 1 }
    const r = scoreHand(bids, tricks, createInitialState().rules)
    expect(r.teamPoints.ns).toBe(-110)
    expect(r.teamPoints.ew).toBe(-40)
  })

  it('scores nil bonus when successful', () => {
    const bids = {
      0: { bid: 0, nil: true },
      1: { bid: 4, nil: false },
      2: { bid: 3, nil: false },
      3: { bid: 3, nil: false },
    }
    const tricks = { 0: 0, 1: 4, 2: 3, 3: 3 }
    const r = scoreHand(bids, tricks, createInitialState().rules)
    expect(r.teamPoints.ns).toBe(130)
    expect(r.nilResults[0]?.made).toBe(true)
  })
})

describe('normalizeSpadesState', () => {
  it('fills missing rules and player fields from legacy saves', () => {
    const raw = {
      ...createInitialState(),
      phase: 'bidding' as const,
      rules: undefined,
      teamBags: undefined,
      teamScores: undefined,
      players: {
        ...createInitialState().players,
        0: { ...createInitialState().players[0], blindNil: undefined as unknown as boolean },
      },
    }
    const s = normalizeSpadesState(raw as unknown as ReturnType<typeof createInitialState>)
    expect(s.rules.raceTo).toBe(500)
    expect(s.players[0].blindNil).toBe(false)
    expect(s.teamBags).toEqual({ ns: 0, ew: 0 })
  })
})

describe('summarizeHand', () => {
  it('builds per-player and team breakdown with bag penalty', () => {
    const bids = {
      0: { bid: 4, nil: false },
      1: { bid: 3, nil: false },
      2: { bid: 4, nil: false },
      3: { bid: 3, nil: false },
    }
    const tricks = { 0: 5, 1: 2, 2: 4, 3: 2 }
    const rules = createInitialState().rules
    const summary = summarizeHand(
      bids,
      tricks,
      rules,
      { ns: 490, ew: 120 },
      { ns: 9, ew: 2 },
    )
    expect(summary.players[0].tricks).toBe(5)
    expect(summary.teams.ns.teamBid).toBe(8)
    expect(summary.teams.ns.tricksTaken).toBe(9)
    expect(summary.teams.ns.handTotal).toBe(81)
    expect(summary.matchTotals.ns).toBe(471)
    expect(summary.bagsAfter.ns).toBe(0)
    expect(summary.teams.ns.bagPenalty).toBe(100)
  })
})

describe('isSpadesInProgress', () => {
  it('is false when idle or game over', () => {
    expect(isSpadesInProgress(createInitialState())).toBe(false)
    const playing = { ...createInitialState(), phase: 'playing' as const }
    expect(isSpadesInProgress(playing)).toBe(true)
  })
})
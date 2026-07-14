import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  dealHand,
  discardCard,
  isEuchreInProgress,
  orderUp,
  passBid,
  startNewGame,
  tryPlayCard,
} from './engine'
import { legalMoves } from './rules'
import { scoreHand } from './scoring'

describe('createInitialState', () => {
  it('starts idle', () => {
    const s = createInitialState()
    expect(s.phase).toBe('idle')
    expect(s.teamScores).toEqual({ ns: 0, ew: 0 })
  })
})

describe('dealHand', () => {
  it('deals five cards and shows upcard', () => {
    const s = dealHand(createInitialState())
    expect(s.phase).toBe('bidding')
    expect(s.players[0].hand).toHaveLength(5)
    expect(s.upcard).not.toBeNull()
  })
})

describe('bidding', () => {
  it('orders up and moves to dealer discard', () => {
    let s = startNewGame(createInitialState())
    while (s.phase === 'bidding' && s.whoseTurn !== 0) {
      s = passBid(s, s.whoseTurn!)
    }
    s = orderUp(s, 0)
    expect(s.phase).toBe('discard')
    expect(s.trump).toBe(s.upcard?.suit)
    expect(s.makerTeam).toBe('ns')
  })

  it('goes to round 2 when all pass', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 4; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    expect(s.biddingRound).toBe(2)
    expect(s.turnedDownSuit).toBe(s.upcard?.suit)
  })
})

describe('scoreHand', () => {
  it('awards march for 5 tricks', () => {
    const r = scoreHand('ns', 5, createInitialState().rules)
    expect(r.points.ns).toBe(2)
    expect(r.marched).toBe(true)
  })

  it('euchres defenders when makers get 2', () => {
    const r = scoreHand('ns', 2, createInitialState().rules)
    expect(r.points.ew).toBe(2)
    expect(r.euchred).toBe(true)
  })
})

describe('isEuchreInProgress', () => {
  it('is true during bidding', () => {
    const s = dealHand(createInitialState())
    expect(isEuchreInProgress(s)).toBe(true)
  })
})

describe('play trick', () => {
  it('enters trick_reveal after a full trick', () => {
    let s = startNewGame(createInitialState())
    while (s.phase === 'bidding' && s.whoseTurn !== 0) {
      s = passBid(s, s.whoseTurn!)
    }
    s = orderUp(s, 0)
    while (s.phase === 'discard') {
      const seat = s.whoseTurn!
      s = discardCard(s, seat, s.players[seat].hand[0])
    }
    expect(s.phase).toBe('playing')
    for (let i = 0; i < 4; i++) {
      const seat = s.whoseTurn!
      const card = legalMoves(s.players[seat].hand, s.currentTrick, s.trump!)[0]
      s = tryPlayCard(s, seat, card)
    }
    expect(s.phase).toBe('trick_reveal')
  })
})
import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import {
  createInitialState,
  dealHand,
  discardCard,
  isEuchreInProgress,
  orderUp,
  passBid,
  startNewGame,
  tryPlayCard,
  withPartner,
} from './engine'
import { dealersPartnerMustOrder, legalMoves } from './rules'
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
    for (const seat of [0, 1, 2, 3] as const) {
      expect(s.players[seat].hand).toHaveLength(5)
    }
    expect(s.kitty).toHaveLength(4)
    expect(s.upcard).not.toBeNull()
    expect(s.upcard?.id).toBe(s.kitty[s.kitty.length - 1]?.id)
    const dealtIds = new Set(
      ([0, 1, 2, 3] as const).flatMap((seat) => s.players[seat].hand.map((c) => c.id)),
    )
    for (const c of s.kitty) {
      expect(dealtIds.has(c.id)).toBe(false)
    }
  })
})

describe('bidding', () => {
  it('orders up and moves to dealer discard', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 12 && s.phase === 'bidding' && s.whoseTurn !== 0; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    if (s.whoseTurn !== 0) {
      s = { ...s, whoseTurn: 0 }
    }
    const upSuit = s.upcard?.suit
    s = orderUp(s, 0)
    expect(s.phase).toBe('discard')
    expect(s.trump).toBe(upSuit)
    expect(s.upcard).toBeNull()
    expect(s.kitty).toHaveLength(3)
    expect(s.makerTeam).toBe('ns')
  })

  it('goes to round 2 when all pass', () => {
    const farmers = () => [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('diamonds', '9'),
      makeCard('diamonds', '10'),
      makeCard('clubs', '9'),
    ]
    const rules = { ...createInitialState().rules, farmersHand: true }
    let s = startNewGame({ ...createInitialState(), rules })
    for (const seat of [0, 1, 2, 3] as const) {
      s.players[seat].hand = farmers()
    }
    for (let i = 0; i < 4; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    expect(s.biddingRound).toBe(2)
    expect(s.turnedDownSuit).not.toBeNull()
    expect(s.upcard).toBeNull()
    expect(s.kitty).toHaveLength(4)
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

describe('farmers hand', () => {
  it('blocks dealer partner pass in strict mode with face cards', () => {
    const rules = { ...createInitialState().rules, farmersHand: false }
    let s = dealHand({ ...createInitialState(), rules })
    const partner = ((s.dealer + 1) % 4) as 0 | 1 | 2 | 3
    s = {
      ...s,
      phase: 'bidding',
      biddingRound: 2,
      whoseTurn: partner,
      passedThisRound: [],
    }
    expect(dealersPartnerMustOrder(s.players[partner].hand, rules)).toBe(true)
    const next = passBid(s, partner)
    expect(next.passedThisRound).not.toContain(partner)
    expect(next.warning).toMatch(/must order|no passing/i)
  })
})

describe('play trick', () => {
  it('enters trick_reveal after a full trick', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 12 && s.phase === 'bidding' && s.whoseTurn !== 0; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    if (s.whoseTurn !== 0) {
      s = { ...s, whoseTurn: 0 }
    }
    s = orderUp(s, 0)
    for (let i = 0; i < 8 && s.phase === 'discard'; i++) {
      const seat = s.whoseTurn!
      s = discardCard(s, seat, s.players[seat].hand[0])
    }
    if (s.phase === 'loner_choice' && s.maker != null) {
      s = withPartner(s, s.maker!)
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
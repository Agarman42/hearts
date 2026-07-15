import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import {
  ackTrumpCall,
  createInitialState,
  normalizeEuchreState,
  dealHand,
  discardCard,
  goAlone,
  isEuchreInProgress,
  nameTrump,
  orderUp,
  passBid,
  runAiTurn,
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
    const upcard = s.upcard
    s = orderUp(s, 0)
    expect(s.phase).toBe('discard')
    expect(s.trump).toBe(upSuit)
    expect(s.upcard).toBeNull()
    expect(s.pickedUpCard).toEqual(upcard)
    expect(s.kitty).toHaveLength(3)
    expect(s.makerTeam).toBe('ns')
    expect(s.players[s.dealer].hand.some((c) => c.id === upcard?.id)).toBe(true)
    expect(s.awaitingTrumpAck).toBe(true)
    expect(s.trumpCallMethod).toBe('order_up')
    const cleared = ackTrumpCall(s)
    expect(cleared.awaitingTrumpAck).toBe(false)
    expect(cleared.trumpCallMethod).toBeNull()
  })

  it('pauses AI while trump recap is showing', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 12 && s.phase === 'bidding' && s.whoseTurn !== 0; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    if (s.whoseTurn !== 0) {
      s = { ...s, whoseTurn: 0 }
    }
    s = orderUp(s, 0)
    expect(s.awaitingTrumpAck).toBe(true)
    const before = s
    const after = runAiTurn(s)
    expect(after).toEqual(before)
  })

  it('sets recap for round-2 name trump', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 4 && s.phase === 'bidding'; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    expect(s.biddingRound).toBe(2)
    const suit = (['hearts', 'diamonds', 'clubs', 'spades'] as const).find(
      (x) => x !== s.turnedDownSuit,
    )!
    s = nameTrump(s, s.whoseTurn!, suit)
    expect(s.trump).toBe(suit)
    expect(s.awaitingTrumpAck).toBe(true)
    expect(s.trumpCallMethod).toBe('name_suit')
  })

  it('goes to round 2 when all pass', () => {
    let s = startNewGame(createInitialState())
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

describe('normalizeEuchreState', () => {
  it('repairs partial saves so hooks do not crash', () => {
    const repaired = normalizeEuchreState({
      phase: 'bidding',
      handNumber: 1,
      dealer: 3,
      whoseTurn: 0,
      players: {},
    } as ReturnType<typeof createInitialState>)
    expect(repaired.currentTrick).toEqual([])
    expect(repaired.passedThisRound).toEqual([])
    expect(repaired.players[0].hand).toEqual([])
    expect(repaired.players[1].name).toBeTruthy()
  })
})

describe('isEuchreInProgress', () => {
  it('is true during bidding', () => {
    const s = dealHand(createInitialState())
    expect(isEuchreInProgress(s)).toBe(true)
  })
})

describe('farmers hand', () => {
  it('allows dealer partner to pass with normal hands', () => {
    const rules = { ...createInitialState().rules, farmersHand: false }
    let s = dealHand({ ...createInitialState(), rules })
    const partner = ((s.dealer + 1) % 4) as 0 | 1 | 2 | 3
    s = {
      ...s,
      phase: 'bidding',
      biddingRound: 1,
      whoseTurn: partner,
      passedThisRound: [],
    }
    expect(dealersPartnerMustOrder(s.players[partner].hand, rules)).toBe(false)
    const next = passBid(s, partner)
    expect(next.passedThisRound).toContain(partner)
  })

  it('blocks dealer partner pass on farmers hand (all 9s and 10s)', () => {
    const farmers = () => [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('diamonds', '9'),
      makeCard('diamonds', '10'),
      makeCard('clubs', '9'),
    ]
    const rules = { ...createInitialState().rules, farmersHand: true }
    let s = dealHand({ ...createInitialState(), rules })
    const partner = ((s.dealer + 1) % 4) as 0 | 1 | 2 | 3
    s = {
      ...s,
      players: {
        ...s.players,
        [partner]: { ...s.players[partner], hand: farmers() },
      },
      phase: 'bidding',
      biddingRound: 1,
      whoseTurn: partner,
      passedThisRound: [],
    }
    expect(dealersPartnerMustOrder(s.players[partner].hand, rules)).toBe(true)
    const next = passBid(s, partner)
    expect(next.passedThisRound).not.toContain(partner)
    expect(next.warning).toMatch(/farmers hand|must order/i)
  })
})

describe('discard', () => {
  it('rejects discarding the kitty pickup card', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 12 && s.phase === 'bidding' && s.whoseTurn !== 0; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    if (s.whoseTurn !== 0) s = { ...s, whoseTurn: 0 }
    s = orderUp(s, 0)
    const dealer = s.dealer
    const pickup = s.pickedUpCard!
    const handBefore = s.players[dealer].hand
    s = discardCard(s, dealer, pickup)
    expect(s.phase).toBe('discard')
    expect(s.players[dealer].hand).toEqual(handBefore)
    expect(s.pickedUpCard).toEqual(pickup)
    expect(s.warning).toMatch(/kitty pickup|different card/i)
  })
})

describe('pass as first bidder', () => {
  it('lets the seat left of dealer pass in round 1', () => {
    let s = dealHand(createInitialState())
    const firstBidder = ((s.dealer + 1) % 4) as 0 | 1 | 2 | 3
    s = { ...s, whoseTurn: firstBidder }
    const next = passBid(s, firstBidder)
    expect(next.passedThisRound).toContain(firstBidder)
    expect(next.warning).toMatch(/passes/i)
  })
})

describe('loner choice', () => {
  it('forces partner in when team needs two or fewer points to win', () => {
    let s = startNewGame(createInitialState())
    for (let i = 0; i < 12 && s.phase === 'bidding' && s.whoseTurn !== 0; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    if (s.whoseTurn !== 0) s = { ...s, whoseTurn: 0 }
    s = orderUp(s, 0)
    for (let i = 0; i < 8 && s.phase === 'discard'; i++) {
      const seat = s.whoseTurn!
      const hand = s.players[seat].hand
      const discard = hand.find((c) => c.id !== s.pickedUpCard?.id) ?? hand[0]
      s = discardCard(s, seat, discard)
    }
    expect(s.phase).toBe('loner_choice')
    s = {
      ...s,
      teamScores: { ns: 8, ew: 4 },
      rules: { ...s.rules, raceTo: 10 },
    }
    const maker = s.maker!
    s = goAlone(s, maker)
    expect(s.loner).toBe(false)
    expect(s.sittingOut).toBeNull()
    expect(s.phase).toBe('playing')
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
      const hand = s.players[seat].hand
      const discard =
        hand.find((c) => c.id !== s.pickedUpCard?.id) ?? hand[0]
      s = discardCard(s, seat, discard)
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
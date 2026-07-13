import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { DEFAULT_HEARTS_RULES } from './types'
import {
  applyMoonScoring,
  illegalReason,
  legalMoves,
  passTarget,
  trickPoints,
  trickWinner,
} from './rules'

describe('passTarget', () => {
  it('passes left to visual left (West from South)', () => {
    // South faces table: West=1 left, East=3 right
    expect(passTarget(0, 'left')).toBe(1)
    expect(passTarget(0, 'right')).toBe(3)
    expect(passTarget(0, 'across')).toBe(2)
  })

  it('wraps correctly from every seat', () => {
    // left = +1 mod 4
    expect(passTarget(1, 'left')).toBe(2)
    expect(passTarget(2, 'left')).toBe(3)
    expect(passTarget(3, 'left')).toBe(0)
    expect(passTarget(1, 'across')).toBe(3)
  })

  it('when passing right, you receive from your left', async () => {
    const { passSource } = await import('./rules')
    // Everyone passes right; South receives from West (left)
    expect(passSource(0, 'right')).toBe(1)
    expect(passSource(0, 'left')).toBe(3)
  })
})

describe('sortHeartsHand order', () => {
  it('orders Hearts → Spades → Diamonds → Clubs, high to low', async () => {
    const { makeCard } = await import('../../core/cards')
    const { sortHeartsHand } = await import('./hand')
    const sorted = sortHeartsHand([
      makeCard('clubs', 'A'),
      makeCard('hearts', '2'),
      makeCard('hearts', 'K'),
      makeCard('spades', 'Q'),
      makeCard('diamonds', 'A'),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['K♥', '2♥', 'Q♠', 'A♦', 'A♣'])
  })
})

describe('legalMoves', () => {
  it('requires 2♣ on first lead when enabled', () => {
    const hand = [makeCard('clubs', '2'), makeCard('hearts', 'A'), makeCard('spades', 'K')]
    const legal = legalMoves(hand, [], false, true, DEFAULT_HEARTS_RULES)
    expect(legal).toHaveLength(1)
    expect(legal[0].id).toBe('2♣')
  })

  it('blocks hearts and Q♠ when void on first trick', () => {
    const hand = [
      makeCard('hearts', '5'),
      makeCard('spades', 'Q'),
      makeCard('diamonds', '3'),
    ]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '3') }]
    const legal = legalMoves(hand, trick, false, true, DEFAULT_HEARTS_RULES)
    expect(legal.map((c) => c.id)).toEqual(['3♦'])
  })

  it('must follow suit', () => {
    const hand = [makeCard('clubs', '9'), makeCard('hearts', 'A')]
    const trick = [{ seat: 2 as const, card: makeCard('clubs', '4') }]
    const legal = legalMoves(hand, trick, true, false, DEFAULT_HEARTS_RULES)
    expect(legal).toHaveLength(1)
    expect(legal[0].suit).toBe('clubs')
  })

  it('blocks leading hearts until broken', () => {
    const hand = [makeCard('hearts', '5'), makeCard('clubs', '9')]
    const legal = legalMoves(hand, [], false, false, DEFAULT_HEARTS_RULES)
    expect(legal.map((c) => c.id)).toEqual(['9♣'])
  })

  it('allows leading hearts when broken', () => {
    const hand = [makeCard('hearts', '5'), makeCard('clubs', '9')]
    const legal = legalMoves(hand, [], true, false, DEFAULT_HEARTS_RULES)
    expect(legal.map((c) => c.id).sort()).toEqual(['5♥', '9♣'].sort())
  })

  it('allows leading hearts when only hearts remain (even if unbroken)', () => {
    const hand = [makeCard('hearts', '5'), makeCard('hearts', 'K')]
    const legal = legalMoves(hand, [], false, false, DEFAULT_HEARTS_RULES)
    expect(legal).toHaveLength(2)
  })

  it('when only points left on first trick void, may play them', () => {
    const hand = [makeCard('hearts', '5'), makeCard('spades', 'Q')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '3') }]
    const legal = legalMoves(hand, trick, false, true, DEFAULT_HEARTS_RULES)
    expect(legal).toHaveLength(2)
  })
})

describe('illegalReason', () => {
  it('explains off-suit plays', () => {
    const hand = [makeCard('clubs', '9'), makeCard('hearts', 'A')]
    const trick = [{ seat: 2 as const, card: makeCard('clubs', '4') }]
    const reason = illegalReason(
      makeCard('hearts', 'A'),
      hand,
      trick,
      true,
      false,
      DEFAULT_HEARTS_RULES,
    )
    expect(reason).toMatch(/follow suit/i)
  })

  it('explains unbroken hearts lead', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('clubs', '3')]
    const reason = illegalReason(
      makeCard('hearts', 'A'),
      hand,
      [],
      false,
      false,
      DEFAULT_HEARTS_RULES,
    )
    expect(reason).toMatch(/not broken/i)
  })
})

describe('trickWinner', () => {
  it('highest of lead suit wins', () => {
    const winner = trickWinner([
      { seat: 0, card: makeCard('diamonds', '5') },
      { seat: 1, card: makeCard('diamonds', 'K') },
      { seat: 2, card: makeCard('hearts', 'A') },
      { seat: 3, card: makeCard('diamonds', '9') },
    ])
    expect(winner).toBe(1)
  })

  it('ignores off-suit higher ranks', () => {
    const winner = trickWinner([
      { seat: 0, card: makeCard('clubs', '3') },
      { seat: 1, card: makeCard('spades', 'A') },
      { seat: 2, card: makeCard('hearts', 'K') },
      { seat: 3, card: makeCard('clubs', '2') },
    ])
    expect(winner).toBe(0)
  })
})

describe('trickPoints', () => {
  it('counts hearts as 1 and Q♠ as 13', () => {
    const pts = trickPoints([
      { seat: 0, card: makeCard('hearts', '5') },
      { seat: 1, card: makeCard('spades', 'Q') },
      { seat: 2, card: makeCard('clubs', '3') },
      { seat: 3, card: makeCard('hearts', 'A') },
    ])
    expect(pts).toBe(15)
  })
})

describe('applyMoonScoring', () => {
  it('dumps 26 on everyone else when someone takes all points', () => {
    const { scores, moonShooter } = applyMoonScoring(
      { 0: 0, 1: 26, 2: 0, 3: 0 },
      true,
    )
    expect(moonShooter).toBe(1)
    expect(scores).toEqual({ 0: 26, 1: 0, 2: 26, 3: 26 })
  })

  it('leaves scores alone when moon is disabled', () => {
    const { scores, moonShooter } = applyMoonScoring(
      { 0: 0, 1: 26, 2: 0, 3: 0 },
      false,
    )
    expect(moonShooter).toBeNull()
    expect(scores[1]).toBe(26)
  })

  it('no moon when points are split', () => {
    const { scores, moonShooter } = applyMoonScoring(
      { 0: 10, 1: 13, 2: 3, 3: 0 },
      true,
    )
    expect(moonShooter).toBeNull()
    expect(scores).toEqual({ 0: 10, 1: 13, 2: 3, 3: 0 })
  })
})

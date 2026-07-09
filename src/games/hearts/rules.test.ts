import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { DEFAULT_HEARTS_RULES } from '../types'
import { illegalReason, legalMoves, passTarget, trickWinner } from './rules'

describe('passTarget', () => {
  it('passes left to player on your left (East from South)', () => {
    expect(passTarget(0, 'left')).toBe(3)
    expect(passTarget(0, 'right')).toBe(1)
    expect(passTarget(0, 'across')).toBe(2)
  })
})

describe('sortHand order', () => {
  it('orders Hearts → Spades → Diamonds → Clubs, high to low', async () => {
    const { sortHand, makeCard } = await import('../../core/cards')
    const sorted = sortHand([
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
})

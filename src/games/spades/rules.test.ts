import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { DEFAULT_SPADES_RULES } from './types'
import {
  applyBagPenalty,
  legalMoves,
  partnerSeat,
  teamId,
  trickWinner,
  validateBid,
} from './rules'

describe('trickWinner', () => {
  it('follows lead suit when no trump played', () => {
    const plays = [
      { seat: 0 as const, card: makeCard('hearts', '5') },
      { seat: 1 as const, card: makeCard('hearts', 'K') },
      { seat: 2 as const, card: makeCard('hearts', '2') },
      { seat: 3 as const, card: makeCard('diamonds', 'A') },
    ]
    expect(trickWinner(plays, false)).toBe(1)
  })

  it('spades trump beats lead suit', () => {
    const plays = [
      { seat: 0 as const, card: makeCard('hearts', 'A') },
      { seat: 1 as const, card: makeCard('spades', '2') },
      { seat: 2 as const, card: makeCard('hearts', 'K') },
      { seat: 3 as const, card: makeCard('hearts', 'Q') },
    ]
    expect(trickWinner(plays, true)).toBe(1)
  })

  it('highest spade wins among trumps', () => {
    const plays = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('spades', '5') },
      { seat: 2 as const, card: makeCard('spades', 'A') },
      { seat: 3 as const, card: makeCard('spades', '7') },
    ]
    expect(trickWinner(plays, true)).toBe(2)
  })
})

describe('legalMoves', () => {
  const hand = [
    makeCard('spades', 'A'),
    makeCard('hearts', 'K'),
    makeCard('clubs', '2'),
  ]

  it('cannot lead spades before broken if other suits available', () => {
    const legal = legalMoves(hand, [], false)
    expect(legal.every((c) => c.suit !== 'spades')).toBe(true)
    expect(legal).toHaveLength(2)
  })

  it('must follow lead suit when possible', () => {
    const trick = [{ seat: 1 as const, card: makeCard('hearts', '5') }]
    const legal = legalMoves(hand, trick, true)
    expect(legal).toHaveLength(1)
    expect(legal[0].suit).toBe('hearts')
  })

  it('may lead any card when spades broken or only spades left', () => {
    const onlySpades = [makeCard('spades', '2'), makeCard('spades', 'K')]
    expect(legalMoves(onlySpades, [], false)).toHaveLength(2)
    expect(legalMoves(hand, [], true)).toHaveLength(3)
  })
})

describe('validateBid', () => {
  it('accepts nil when enabled', () => {
    expect(validateBid(0, true, DEFAULT_SPADES_RULES)).toBe(true)
  })

  it('rejects out-of-range bids', () => {
    expect(validateBid(14, false, DEFAULT_SPADES_RULES)).toBe(false)
    expect(validateBid(3, false, DEFAULT_SPADES_RULES)).toBe(true)
  })
})

describe('partnership helpers', () => {
  it('maps seats to teams', () => {
    expect(teamId(0)).toBe('ns')
    expect(teamId(2)).toBe('ns')
    expect(teamId(1)).toBe('ew')
    expect(partnerSeat(0)).toBe(2)
    expect(partnerSeat(3)).toBe(1)
  })
})

describe('applyBagPenalty', () => {
  it('deducts 100 per 10 bags and keeps remainder', () => {
    const r = applyBagPenalty(23, DEFAULT_SPADES_RULES)
    expect(r.penalty).toBe(200)
    expect(r.bags).toBe(3)
  })

  it('returns no penalty when disabled', () => {
    const r = applyBagPenalty(15, { ...DEFAULT_SPADES_RULES, bagPenalty: false })
    expect(r.penalty).toBe(0)
    expect(r.bags).toBe(15)
  })

  it('mercy rule resets bags without penalty', () => {
    const r = applyBagPenalty(23, { ...DEFAULT_SPADES_RULES, bagMercy: true })
    expect(r.penalty).toBe(0)
    expect(r.bags).toBe(3)
  })
})
import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import {
  cardPower,
  effectiveSuit,
  isLeftBower,
  isRightBower,
  legalMoves,
  trickWinner,
} from './rules'

describe('euchre bowers', () => {
  it('identifies right and left bowers for hearts trump', () => {
    expect(isRightBower(makeCard('hearts', 'J'), 'hearts')).toBe(true)
    expect(isLeftBower(makeCard('diamonds', 'J'), 'hearts')).toBe(true)
    expect(isLeftBower(makeCard('hearts', 'J'), 'hearts')).toBe(false)
  })

  it('treats left bower as trump suit', () => {
    expect(effectiveSuit(makeCard('diamonds', 'J'), 'hearts')).toBe('hearts')
  })

  it('ranks right bower above left bower and ace of trump', () => {
    const trump = 'hearts' as const
    expect(cardPower(makeCard('hearts', 'J'), trump)).toBeGreaterThan(
      cardPower(makeCard('diamonds', 'J'), trump),
    )
    expect(cardPower(makeCard('diamonds', 'J'), trump)).toBeGreaterThan(
      cardPower(makeCard('hearts', 'A'), trump),
    )
  })
})

describe('trickWinner', () => {
  it('trump beats led suit', () => {
    const trump = 'hearts' as const
    const plays = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('hearts', '9') },
    ]
    expect(trickWinner(plays, trump)).toBe(1)
  })

  it('left bower wins over off-suit ace', () => {
    const trump = 'hearts' as const
    const plays = [
      { seat: 0 as const, card: makeCard('spades', 'A') },
      { seat: 2 as const, card: makeCard('diamonds', 'J') },
    ]
    expect(trickWinner(plays, trump)).toBe(2)
  })

  it('highest of led suit wins when no trump played', () => {
    const trump = 'hearts' as const
    const plays = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', 'K') },
      { seat: 2 as const, card: makeCard('clubs', '10') },
    ]
    expect(trickWinner(plays, trump)).toBe(1)
  })
})

describe('legalMoves', () => {
  it('must follow effective suit including left bower', () => {
    const trump = 'hearts' as const
    const hand = [
      makeCard('diamonds', 'J'),
      makeCard('spades', 'A'),
      makeCard('clubs', '10'),
    ]
    const trick = [{ seat: 0 as const, card: makeCard('hearts', 'K') }]
    const legal = legalMoves(hand, trick, trump)
    expect(legal.map((c) => c.id)).toEqual(['J♦'])
  })

  it('may play any card when void in led suit', () => {
    const trump = 'hearts' as const
    const hand = [makeCard('spades', 'A'), makeCard('clubs', '10')]
    const trick = [{ seat: 0 as const, card: makeCard('diamonds', '9') }]
    expect(legalMoves(hand, trick, trump).length).toBe(2)
  })
})
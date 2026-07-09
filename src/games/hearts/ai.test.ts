import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { DEFAULT_HEARTS_RULES } from '../types'
import { choosePassCards, choosePlay } from './ai'

const fixedRng = () => 0.1

describe('choosePassCards', () => {
  it('hard prefers dumping Q♠ and high spades', () => {
    const hand = [
      makeCard('spades', 'Q'),
      makeCard('spades', 'A'),
      makeCard('spades', '3'),
      makeCard('spades', '4'),
      makeCard('hearts', '2'),
      makeCard('clubs', '3'),
      makeCard('diamonds', '4'),
      makeCard('clubs', '5'),
      makeCard('diamonds', '6'),
      makeCard('clubs', '7'),
      makeCard('diamonds', '8'),
      makeCard('clubs', '9'),
      makeCard('diamonds', '10'),
    ]
    const passed = choosePassCards(hand, 'hard', fixedRng)
    expect(passed.some((c) => c.id === 'Q♠')).toBe(true)
    // Keep low spade cover — shouldn't dump both low spades with Q
    const lowSpadesPassed = passed.filter(
      (c) => c.suit === 'spades' && c.rank !== 'Q' && c.rank !== 'A' && c.rank !== 'K',
    )
    expect(lowSpadesPassed.length).toBeLessThanOrEqual(1)
  })
})

describe('choosePlay hard', () => {
  it('ducks under a high card when following suit', () => {
    const hand = [makeCard('clubs', '5'), makeCard('clubs', 'K'), makeCard('hearts', '2')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, false, DEFAULT_HEARTS_RULES, 'hard', fixedRng)
    expect(card.id).toBe('5♣')
  })

  it('does not dump Q♠ early on a void with no points in the trick', () => {
    const hand = [
      makeCard('spades', 'Q'),
      makeCard('diamonds', '9'),
      makeCard('diamonds', '3'),
    ]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 1 as const, card: makeCard('clubs', '8') },
    ]
    const card = choosePlay(hand, trick, true, false, DEFAULT_HEARTS_RULES, 'hard', fixedRng)
    expect(card.id).not.toBe('Q♠')
  })

  it('dumps Q♠ when last to play on a point trick', () => {
    const hand = [makeCard('spades', 'Q'), makeCard('diamonds', '9')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 1 as const, card: makeCard('clubs', '8') },
      { seat: 2 as const, card: makeCard('hearts', '5') },
    ]
    const card = choosePlay(hand, trick, true, false, DEFAULT_HEARTS_RULES, 'hard', fixedRng)
    expect(card.id).toBe('Q♠')
  })
})

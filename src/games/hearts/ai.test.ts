import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { DEFAULT_HEARTS_RULES } from '../types'
import { choosePassCards, choosePlay } from './ai'

const fixedRng = () => 0.1

describe('choosePassCards', () => {
  it('hard keeps Q♠ when it has low spade cover; dumps A♠ instead', () => {
    const hand = [
      makeCard('spades', 'Q'),
      makeCard('spades', 'A'),
      makeCard('spades', '3'),
      makeCard('spades', '4'),
      makeCard('hearts', 'K'),
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
    // With cover (3♠, 4♠), hard keeps the Queen and dumps A♠ / high hearts
    expect(passed.some((c) => c.id === 'Q♠')).toBe(false)
    expect(passed.some((c) => c.id === 'A♠')).toBe(true)
    const lowSpadesPassed = passed.filter(
      (c) => c.suit === 'spades' && c.rank !== 'Q' && c.rank !== 'A' && c.rank !== 'K',
    )
    expect(lowSpadesPassed.length).toBe(0)
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

  it('medium does not slingshot hearts on a clean void trick', () => {
    const hand = [
      makeCard('hearts', 'K'),
      makeCard('diamonds', '3'),
      makeCard('diamonds', '7'),
    ]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '9') }]
    const card = choosePlay(
      hand,
      trick,
      true,
      false,
      DEFAULT_HEARTS_RULES,
      'medium',
      fixedRng,
      { myPoints: 0, maxOppPoints: 0, heartsLeftInPlay: 13, seat: 2 },
    )
    expect(card.suit).not.toBe('hearts')
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

import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { chooseBid, choosePlay } from './ai'
import { DEFAULT_SPADES_RULES } from './types'

const fixedRng = () => 0.1

const basePlayCtx = {
  bids: {
    0: { bid: 4, nil: false },
    1: { bid: 3, nil: false },
    2: { bid: 4, nil: false },
    3: { bid: 3, nil: false },
  },
  tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
  teamBags: { ns: 0, ew: 0 },
  rules: DEFAULT_SPADES_RULES,
} as const

describe('choosePlay partner awareness', () => {
  it('sloughs off-suit when partner is winning instead of trumping', () => {
    const hand = [
      makeCard('spades', 'A'),
      makeCard('hearts', '3'),
      makeCard('diamonds', '4'),
    ]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'K') },
      { seat: 1 as const, card: makeCard('clubs', 'A') },
      { seat: 2 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 3, {
      ...basePlayCtx,
      seat: 3,
    })
    expect(card.suit).not.toBe('spades')
    expect(card.id).toBe('3♥')
  })

  it('does not trump partner winner when void in lead suit', () => {
    const hand = [makeCard('spades', '2'), makeCard('hearts', '5')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'K') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('5♥')
  })

  it('does not overtake partner ace with king when following suit', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'K') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('4♣')
  })

  it('does not overtake partner when following suit', () => {
    const hand = [makeCard('clubs', 'K'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('4♣')
  })

  it('wins with minimum trump when opponent is winning and team needs tricks', () => {
    const hand = [
      makeCard('spades', 'K'),
      makeCard('spades', '5'),
      makeCard('hearts', '2'),
    ]
    const trick = [{ seat: 1 as const, card: makeCard('diamonds', 'A') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 2, 2: 0, 3: 1 },
    })
    expect(card.id).toBe('5♠')
  })

  it('ducks when team is already at bid (bag risk)', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 4, 1: 1, 2: 4, 3: 2 },
    })
    expect(card.id).toBe('3♣')
  })

  it('leads high when partner bid nil instead of a deuce', () => {
    const hand = [
      makeCard('clubs', '2'),
      makeCard('clubs', 'A'),
      makeCard('hearts', '5'),
    ]
    const card = choosePlay(hand, [], false, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♣')
  })

  it('dumps high cards when nil partner is winning the trick', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('clubs', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('spades', 'A') },
      { seat: 1 as const, card: makeCard('spades', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('K♥')
  })

  it('nil bidder plays safe cards that do not win', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '2')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '9') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 0, {
      ...basePlayCtx,
      seat: 0,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('2♣')
  })

  it('leads ace for nil cover over low card from long weak suit', () => {
    const hand = [
      makeCard('clubs', '7'),
      makeCard('clubs', '8'),
      makeCard('clubs', '9'),
      makeCard('hearts', 'A'),
    ]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♥')
  })

  it('still takes needed tricks at critical bag count while under contract', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      teamBags: { ns: 9, ew: 0 },
      tricksWon: { 0: 3, 1: 1, 2: 3, 3: 2 },
    })
    expect(card.id).toBe('A♣')
  })

  it('ducks overtricks at critical bag count when contract is already made', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      teamBags: { ns: 9, ew: 0 },
      tricksWon: { 0: 4, 1: 1, 2: 4, 3: 2 },
    })
    expect(card.id).toBe('3♣')
  })
})

describe('chooseBid', () => {
  it('bids higher when partner declared nil', () => {
    const weakHand = [
      makeCard('hearts', '9'),
      makeCard('diamonds', '9'),
      makeCard('clubs', '10'),
      makeCard('hearts', '10'),
      makeCard('diamonds', '10'),
      makeCard('clubs', '9'),
      makeCard('hearts', 'J'),
      makeCard('diamonds', 'J'),
      makeCard('clubs', 'J'),
      makeCard('hearts', 'Q'),
      makeCard('diamonds', 'Q'),
      makeCard('clubs', 'Q'),
      makeCard('hearts', 'K'),
    ]
    const solo = chooseBid(weakHand, 'medium', fixedRng)
    const covering = chooseBid(weakHand, 'medium', fixedRng, {
      seat: 1,
      bids: { 3: { bid: 0, nil: true, blindNil: false } },
    })
    expect(covering.bid).toBeGreaterThanOrEqual(solo.bid)
  })
})
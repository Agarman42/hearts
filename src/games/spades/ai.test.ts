import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { chooseBid, choosePlay } from './ai'

const fixedRng = () => 0.1

describe('choosePlay', () => {
  it('wins the trick for seat 2 when a high club beats the lead', () => {
    const hand = [makeCard('clubs', 'K'), makeCard('hearts', '5'), makeCard('diamonds', '3')]
    const trick = [{ seat: 0 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2)
    expect(card.id).toBe('K♣')
  })

  it('ducks under a winning card for seat 1 when following suit', () => {
    const hand = [makeCard('clubs', '5'), makeCard('clubs', 'K'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 2 as const, card: makeCard('clubs', 'A') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 1)
    expect(card.id).toBe('5♣')
  })

  it('does not treat every AI seat as seat 0 when evaluating winners', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('spades', '2')]
    const trick = [{ seat: 0 as const, card: makeCard('clubs', '10') }]
    const asSeat2 = choosePlay(hand, trick, true, 'hard', fixedRng, 2)
    const asSeat0 = choosePlay(hand, trick, true, 'hard', fixedRng, 0)
    expect(asSeat2.id).toBe('A♣')
    expect(asSeat0.id).toBe('A♣')
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
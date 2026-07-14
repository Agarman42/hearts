import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { chooseGoAlone, chooseOrderUp, choosePlay, chooseTrumpSuit } from './ai'

describe('euchre AI', () => {
  it('orders up with strong trump', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('hearts', 'K'),
      makeCard('clubs', '9'),
      makeCard('spades', '9'),
    ]
    expect(chooseOrderUp(hand, 'hearts', 'hard', () => 0, undefined, true)).toBe(true)
  })

  it('chooses trump suit in round 2', () => {
    const hand = [
      makeCard('diamonds', '9'),
      makeCard('diamonds', '10'),
      makeCard('diamonds', 'K'),
      makeCard('clubs', '9'),
      makeCard('spades', '9'),
    ]
    expect(chooseTrumpSuit(hand, 'hearts', 'hard', () => 0)).toBe('diamonds')
  })

  it('goes alone with bowers and trump depth', () => {
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('diamonds', 'J'),
      makeCard('hearts', 'A'),
      makeCard('hearts', 'K'),
      makeCard('clubs', '9'),
    ]
    expect(chooseGoAlone(hand, 'hearts', 'hard', () => 0)).toBe(true)
  })

  it('plays legal card from hand', () => {
    const card = makeCard('hearts', '9')
    const played = choosePlay([card], [], 'hearts', 'medium', () => 0, 0)
    expect(played.id).toBe(card.id)
  })

  it('prefers next-suit call when upcard is turned down', () => {
    const hand = [
      makeCard('diamonds', '9'),
      makeCard('diamonds', '10'),
      makeCard('clubs', '9'),
      makeCard('spades', '9'),
      makeCard('clubs', '10'),
    ]
    expect(chooseTrumpSuit(hand, 'hearts', 'hard', () => 0)).toBe('diamonds')
  })

  it('maker leads low trump to pull', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
    })
    expect(played.suit).toBe('hearts')
    expect(played.rank).toBe('9')
  })

  it('defender leads trump to pull when holding multiple trump', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 1, {
      seat: 1,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.suit).toBe('hearts')
    expect(played.rank).toBe('9')
  })

  it('maker team wins with cheap trump when behind on tricks', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('diamonds', '9')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', 'A') }]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 1, 2: 0, 3: 0 },
    })
    expect(played.suit).toBe('hearts')
  })

  it('sloughs low when void and partner is winning', () => {
    const hand = [makeCard('diamonds', '9'), makeCard('diamonds', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '10') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
    })
    expect(played.id).toBe('3♦')
  })
})
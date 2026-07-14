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
    expect(chooseOrderUp(hand, 'hearts', 'hard', () => 0)).toBe(true)
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
})
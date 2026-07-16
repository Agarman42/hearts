import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { sortEuchreHand } from './hand'

describe('sortEuchreHand', () => {
  it('groups by suit with highest rank on the left before trump is set', () => {
    const sorted = sortEuchreHand(
      [makeCard('clubs', '9'), makeCard('hearts', 'A'), makeCard('diamonds', '10')],
      null,
    )
    expect(sorted.map((c) => c.id)).toEqual(['A♥', '9♣', '10♦'])
  })

  it('keeps trump on the left, highest trump power first', () => {
    const sorted = sortEuchreHand(
      [
        makeCard('hearts', '9'),
        makeCard('hearts', 'A'),
        makeCard('diamonds', 'J'),
        makeCard('clubs', 'K'),
      ],
      'hearts',
    )
    expect(sorted.map((c) => c.id)).toEqual(['J♦', 'A♥', '9♥', 'K♣'])
  })

  it('keeps each off-trump suit together, highest rank first in the suit', () => {
    const sorted = sortEuchreHand(
      [makeCard('clubs', '2'), makeCard('spades', '10'), makeCard('spades', 'K')],
      'diamonds',
    )
    expect(sorted.map((c) => c.id)).toEqual(['K♠', '10♠', '2♣'])
  })

  it('alternates off-trump colors when trump is red', () => {
    const sorted = sortEuchreHand(
      [
        makeCard('clubs', 'K'),
        makeCard('diamonds', '9'),
        makeCard('spades', '10'),
      ],
      'hearts',
    )
    expect(sorted.map((c) => c.id)).toEqual(['10♠', '9♦', 'K♣'])
  })
})
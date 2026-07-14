import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { sortEuchreHand } from './hand'

describe('sortEuchreHand', () => {
  it('orders highest rank on the left before trump is set', () => {
    const sorted = sortEuchreHand(
      [makeCard('clubs', '9'), makeCard('hearts', 'A'), makeCard('diamonds', '10')],
      null,
    )
    expect(sorted.map((c) => c.id)).toEqual(['A♥', '10♦', '9♣'])
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

  it('orders off-trump cards by rank, not suit group', () => {
    const sorted = sortEuchreHand(
      [makeCard('clubs', 'K'), makeCard('spades', 'A'), makeCard('diamonds', '2')],
      'hearts',
    )
    expect(sorted.map((c) => c.id)).toEqual(['A♠', 'K♣', '2♦'])
  })
})
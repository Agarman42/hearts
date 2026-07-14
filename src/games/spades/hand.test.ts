import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { sortSpadesHand } from './hand'

describe('sortSpadesHand', () => {
  it('orders highest rank on the left, lowest on the right', () => {
    const sorted = sortSpadesHand([
      makeCard('clubs', '2'),
      makeCard('spades', 'A'),
      makeCard('hearts', 'K'),
      makeCard('diamonds', 'A'),
      makeCard('spades', '7'),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['A♠', 'A♦', 'K♥', '7♠', '2♣'])
  })
})
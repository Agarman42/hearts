import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { sortSpadesHand } from './hand'

describe('sortSpadesHand', () => {
  it('groups suits left-to-right with highest rank first in each suit', () => {
    const sorted = sortSpadesHand([
      makeCard('clubs', '2'),
      makeCard('spades', 'A'),
      makeCard('hearts', 'K'),
      makeCard('diamonds', 'A'),
      makeCard('spades', '7'),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['A♠', '7♠', 'K♥', '2♣', 'A♦'])
  })
})
import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { alternateColorSuitOrder, sortEuchreHand } from './hand'

describe('alternateColorSuitOrder', () => {
  it('orders present suits black-red-black when both colors exist', () => {
    expect(alternateColorSuitOrder(['clubs', 'diamonds', 'spades'])).toEqual([
      'spades',
      'diamonds',
      'clubs',
    ])
  })

  it('starts with red when two reds and one black (R-B-R)', () => {
    expect(alternateColorSuitOrder(['hearts', 'clubs', 'diamonds'])).toEqual([
      'hearts',
      'clubs',
      'diamonds',
    ])
  })
})

describe('sortEuchreHand', () => {
  it('groups by suit with alternating colors before trump is set', () => {
    const sorted = sortEuchreHand(
      [makeCard('clubs', '9'), makeCard('hearts', 'A'), makeCard('diamonds', '10')],
      null,
    )
    // 1 black, 2 red → start red: hearts, clubs, diamonds
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
      [makeCard('clubs', '9'), makeCard('spades', '10'), makeCard('spades', 'K')],
      'diamonds',
    )
    // Only blacks in hand → both black groups
    expect(sorted.map((c) => c.id)).toEqual(['K♠', '10♠', '9♣'])
  })

  it('alternates off-trump colors for suits actually in hand (not missing slots)', () => {
    // Trump hearts; hand has ♠ and ♦ only — must be black then red (not two blacks
    // because a missing ♣ "slot" used to sit between them).
    const sorted = sortEuchreHand(
      [makeCard('diamonds', '9'), makeCard('spades', '10'), makeCard('spades', 'K')],
      'hearts',
    )
    expect(sorted.map((c) => c.id)).toEqual(['K♠', '10♠', '9♦'])
  })

  it('alternates off-trump when trump is black (R-B-R for present reds/blacks)', () => {
    const sorted = sortEuchreHand(
      [
        makeCard('clubs', 'K'),
        makeCard('diamonds', '9'),
        makeCard('hearts', '10'),
      ],
      'spades',
    )
    expect(sorted.map((c) => c.id)).toEqual(['10♥', 'K♣', '9♦'])
  })

  it('keeps suit groups together after trump is set', () => {
    const sorted = sortEuchreHand(
      [
        makeCard('clubs', '9'),
        makeCard('hearts', 'A'),
        makeCard('clubs', 'K'),
        makeCard('hearts', '10'),
      ],
      'diamonds',
    )
    // Present: ♣ ♥ → black first (equal? 1 each → black first): clubs then hearts
    expect(sorted.map((c) => c.id)).toEqual(['K♣', '9♣', 'A♥', '10♥'])
  })
})

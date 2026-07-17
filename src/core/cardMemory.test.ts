import { describe, expect, it } from 'vitest'
import { makeCard } from './cards'
import {
  cardStillOut,
  collectPlayedIds,
  detectVoids,
  isMasterInSuit,
  unknownCards,
} from './cardMemory'

describe('cardMemory', () => {
  it('collects played ids from completed and current tricks', () => {
    const ids = collectPlayedIds(
      [{ plays: [{ seat: 0, card: makeCard('clubs', 'A') }] }],
      [{ seat: 1, card: makeCard('clubs', 'K') }],
    )
    expect(ids.has('A♣')).toBe(true)
    expect(ids.has('K♣')).toBe(true)
    expect(ids.size).toBe(2)
  })

  it('marks ace as master and king only after ace is gone', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('hearts', '3')]
    const empty = new Set<string>()
    expect(isMasterInSuit(hand[0]!, hand, empty)).toBe(false)
    const acePlayed = new Set(['A♥'])
    expect(isMasterInSuit(hand[0]!, hand, acePlayed)).toBe(true)
  })

  it('detects voids when a seat fails to follow', () => {
    const voids = detectVoids([
      {
        plays: [
          { seat: 0, card: makeCard('clubs', 'A') },
          { seat: 1, card: makeCard('hearts', '2') },
          { seat: 2, card: makeCard('clubs', '3') },
          { seat: 3, card: makeCard('clubs', '4') },
        ],
      },
    ])
    expect(voids[1].has('clubs')).toBe(true)
    expect(voids[2].has('clubs')).toBe(false)
  })

  it('unknown cards exclude hand and played', () => {
    const hand = [makeCard('spades', 'A')]
    const played = new Set(['A♥'])
    const unk = unknownCards(hand, played)
    expect(unk.some((c) => c.id === 'A♠')).toBe(false)
    expect(unk.some((c) => c.id === 'A♥')).toBe(false)
    expect(unk.length).toBe(50)
  })

  it('cardStillOut tracks queen of spades', () => {
    const hand = [makeCard('hearts', '2')]
    expect(cardStillOut('Q', 'spades', hand, new Set())).toBe(true)
    expect(cardStillOut('Q', 'spades', hand, new Set(['Q♠']))).toBe(false)
    expect(cardStillOut('Q', 'spades', [makeCard('spades', 'Q')], new Set())).toBe(false)
  })
})

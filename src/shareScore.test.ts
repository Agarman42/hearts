import { describe, expect, it } from 'vitest'
import {
  buildShareText,
  euchreHandRecapLines,
  heartsHandRecapLines,
  spadesHandRecapLines,
} from './shareScore'

describe('buildShareText', () => {
  it('includes recap lines and the parlour URL', () => {
    const text = buildShareText({
      game: 'Spades',
      title: 'Hand 3',
      lines: spadesHandRecapLines({
        nsBid: 8,
        nsMade: 9,
        ewBid: 5,
        ewMade: 4,
        nsBags: 7,
        ewBags: 2,
        nilLine: 'Nil made — Adam',
      }),
    })
    expect(text).toContain('Card Parlour · Spades')
    expect(text).toContain('NS 9/8')
    expect(text).toContain('Nil made')
    expect(text).toContain('https://agarman42.github.io/hearts/')
  })

  it('Hearts recap names who ate the Queen', () => {
    const lines = heartsHandRecapLines({
      names: ['Adam', 'Angie', 'Scott', 'Heather'],
      handPoints: [2, 16, 4, 4],
      queenSeat: 1,
      moonShooter: null,
    })
    expect(lines[1]).toContain('Angie ate Q♠')
    expect(lines.some((l) => /moon/i.test(l))).toBe(true)
  })

  it('Euchre recap flags a euchre', () => {
    const lines = euchreHandRecapLines({
      makers: 'NS',
      makerTricks: 2,
      euchred: true,
      marched: false,
      loner: false,
    })
    expect(lines.join(' ')).toContain('Euchre')
    expect(lines[0]).toContain('2/5')
  })
})

import { describe, expect, it } from 'vitest'
import { createDeck, deal, dealEuchre, freshShuffledDeck } from './deck'

describe('dealEuchre', () => {
  it('deals five cards per player and four in the kitty', () => {
    const deck = freshShuffledDeck(() => 0.5, 'euchre24')
    const { hands, kitty } = dealEuchre(deck)
    expect(hands).toHaveLength(4)
    hands.forEach((hand) => expect(hand).toHaveLength(5))
    expect(kitty).toHaveLength(4)
    const dealt = hands.flat().length + kitty.length
    expect(dealt).toBe(24)
  })
})

describe('deal', () => {
  it('deals thirteen cards per player from a standard deck', () => {
    const deck = createDeck('standard52')
    const hands = deal(deck, 4)
    expect(hands).toHaveLength(4)
    hands.forEach((hand) => expect(hand).toHaveLength(13))
  })
})
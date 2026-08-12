import { describe, expect, it } from 'vitest'
import { makeCard } from '../core/cards'
import { createInitialState, dealHand, startNewGame } from '../games/spades/engine'
import { applyGameAction } from './apply'

describe('applyGameAction', () => {
  it("rejects a play when it is not that seat's turn", () => {
    const s = dealHand(startNewGame(createInitialState()))
    const card = s.players[1].hand[0]
    const result = applyGameAction(
      { gameId: 'spades', state: s },
      { type: 'play_card', cardId: card.id },
      1,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('not_your_turn')
  })

  it("rejects a card not in the seat's hand", () => {
    let s = dealHand(startNewGame(createInitialState()))
    // force playing phase and whoseTurn 0; use an id never dealt (or clear hand)
    s = {
      ...s,
      phase: 'playing',
      whoseTurn: 0,
      players: { ...s.players, 0: { ...s.players[0], hand: s.players[0].hand.filter((c) => c.id !== makeCard('clubs', 'A').id) } },
    }
    const result = applyGameAction(
      { gameId: 'spades', state: s },
      { type: 'play_card', cardId: makeCard('clubs', 'A').id },
      0,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(['illegal', 'not_your_turn']).toContain(result.code)
  })

  it('applies a legal spades bid for whoseTurn', () => {
    const s = dealHand(startNewGame(createInitialState()))
    const seat = s.whoseTurn
    expect(seat).not.toBeNull()
    const result = applyGameAction(
      { gameId: 'spades', state: s },
      { type: 'submit_bid', bid: 3 },
      seat!,
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.bundle.gameId === 'spades') {
      expect(result.bundle.state.bids[seat!]?.bid).toBe(3)
    }
  })
})

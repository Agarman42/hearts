import { describe, expect, it } from 'vitest'
import { createInitialState as createHeartsState } from './hearts/engine'
import { createInitialState } from './spades/engine'
import {
  seatViewsFromHearts,
  seatViewsFromSpades,
  heartsPlayerToSeatView,
  spadesPlayerToSeatView,
} from './tablePlayer'
import type { Seat } from '../core/types'

describe('seatViewsFromSpades', () => {
  it('uses projected cardCount when the opponent hand is empty', () => {
    const base = createInitialState()
    const hidden = {
      ...base.players[1],
      hand: [],
      cardCount: 13,
    }
    const view = spadesPlayerToSeatView(hidden, hidden.cardCount)
    expect(hidden.hand).toEqual([])
    expect(view.cardCount).toBe(13)

    const players = {
      0: base.players[0],
      1: hidden,
      2: { ...base.players[2], hand: [], cardCount: 13 },
      3: { ...base.players[3], hand: [], cardCount: 12 },
    } as Record<Seat, (typeof base.players)[1] & { cardCount?: number }>
    const seats = seatViewsFromSpades(players, 0)
    expect(seats[1].cardCount).toBe(13)
    expect(seats[2].cardCount).toBe(13)
    expect(seats[3].cardCount).toBe(12)
  })
})

describe('seatViewsFromHearts', () => {
  it('uses projected cardCount when the opponent hand is empty', () => {
    const base = createHeartsState()
    const hidden = {
      ...base.players[1],
      hand: [],
      cardCount: 13,
    }
    const view = heartsPlayerToSeatView(hidden, hidden.cardCount)
    expect(hidden.hand).toEqual([])
    expect(view.cardCount).toBe(13)

    const players = {
      0: base.players[0],
      1: hidden,
      2: { ...base.players[2], hand: [], cardCount: 13 },
      3: { ...base.players[3], hand: [], cardCount: 12 },
    } as Record<Seat, (typeof base.players)[1] & { cardCount?: number }>
    const seats = seatViewsFromHearts(players)
    expect(seats[1].cardCount).toBe(13)
    expect(seats[2].cardCount).toBe(13)
    expect(seats[3].cardCount).toBe(12)
  })
})

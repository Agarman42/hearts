import { describe, expect, it } from 'vitest'
import { applyHumanSeats } from '../../passAndPlay'
import {
  acceptReceived,
  advanceAfterTrick,
  confirmPass,
  createInitialState,
  nextHand,
  showMatchResults,
  startNewGame,
  togglePassCard,
  type HeartsState,
} from './engine'

describe('engine integration', () => {
  it('starts a new game in passing phase with dealt hands', () => {
    const state = startNewGame(createInitialState())
    expect(state.phase).toBe('passing')
    expect(state.handNumber).toBe(1)
    expect(state.players[0].hand.length).toBe(13)
  })

  it('human pass flow: confirm → receiving → accept → playing', () => {
    let state = startNewGame(createInitialState())
    const picks = state.players[0].hand.slice(0, 3)
    for (const card of picks) {
      state = togglePassCard(state, card)
    }
    state = confirmPass(state)
    expect(state.phase).toBe('receiving')
    expect(state.receivedCards.length).toBe(3)
    state = acceptReceived(state)
    expect(state.phase).toBe('playing')
    expect(state.receivedCards.length).toBe(0)
  })

  it('match-ending hand stays on hand_result with matchComplete', () => {
    const base = createInitialState()
    let state: HeartsState = {
      ...base,
      phase: 'trick_reveal',
      handNumber: 5,
      players: {
        0: { ...base.players[0], hand: [], handPoints: 5, totalScore: 98 },
        1: { ...base.players[1], hand: [], handPoints: 10, totalScore: 40 },
        2: { ...base.players[2], hand: [], handPoints: 8, totalScore: 55 },
        3: { ...base.players[3], hand: [], handPoints: 3, totalScore: 30 },
      },
      handScores: null,
      moonShooter: null,
      lastTrick: null,
      completedTricks: [],
    }
    state = advanceAfterTrick(state)
    expect(state.phase).toBe('hand_result')
    expect(state.matchComplete).toBe(true)
    expect(state.winner).toBe(3)
    expect(state.handScores?.[0]).toBe(5)
  })

  it('showMatchResults moves to game_over', () => {
    const base = createInitialState()
    const state = {
      ...base,
      phase: 'hand_result' as const,
      matchComplete: true,
      winner: 0 as const,
      players: {
        ...base.players,
        0: { ...base.players[0], totalScore: 42, name: 'You' },
      },
      handScores: { 0: 2, 1: 8, 2: 5, 3: 11 },
    }
    const next = showMatchResults(state)
    expect(next.phase).toBe('game_over')
  })

  it('multi-human pass-and-play cycles pass then receive per seat', () => {
    let state = startNewGame(createInitialState())
    state = applyHumanSeats(state, {
      passAndPlay: true,
      humanSeats: { 0: true, 1: true, 2: false, 3: false },
    })
    expect(state.whoseTurn).toBe(0)

    const pick0 = state.players[0].hand.slice(0, 3)
    for (const card of pick0) state = togglePassCard(state, card)
    state = confirmPass(state)
    expect(state.phase).toBe('passing')
    expect(state.whoseTurn).toBe(1)

    const pick1 = state.players[1].hand.slice(0, 3)
    for (const card of pick1) state = togglePassCard(state, card)
    state = confirmPass(state)
    expect(state.phase).toBe('receiving')
    expect(state.whoseTurn).toBe(0)
    expect(state.receivedCards).toHaveLength(3)

    state = acceptReceived(state)
    expect(state.phase).toBe('receiving')
    expect(state.whoseTurn).toBe(1)

    state = acceptReceived(state)
    expect(state.phase).toBe('playing')
    expect(state.players[0].hand).toHaveLength(13)
    expect(state.players[1].hand).toHaveLength(13)
  })

  it('nextHand deals when match not complete', () => {
    let state = startNewGame(createInitialState())
    state = { ...state, phase: 'hand_result', matchComplete: false }
    const n = nextHand(state)
    expect(n.phase).toBe('passing')
    expect(n.handNumber).toBe(state.handNumber + 1)
  })
})
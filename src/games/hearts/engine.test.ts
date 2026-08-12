import { describe, expect, it } from 'vitest'
import { applyHumanSeats } from '../../passAndPlay'
import { choosePassCards } from './ai'
import {
  acceptReceived,
  acceptReceivedForSeat,
  advanceAfterTrick,
  confirmPass,
  confirmPassForSeat,
  createInitialState,
  dealHand,
  nextHand,
  showMatchResults,
  startNewGame,
  togglePassCard,
  togglePassCardForSeat,
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

  it('togglePassCard works for whoseTurn even if isHuman flag is stale', () => {
    let state = startNewGame(createInitialState())
    state = {
      ...state,
      players: {
        ...state.players,
        0: { ...state.players[0], isHuman: false },
      },
    }
    const card = state.players[0].hand[0]
    state = togglePassCard(state, card)
    expect(state.players[0].selectedPass).toHaveLength(1)
    expect(state.players[0].selectedPass[0].id).toBe(card.id)
  })

  it('nextHand deals when match not complete', () => {
    let state = startNewGame(createInitialState())
    state = { ...state, phase: 'hand_result', matchComplete: false }
    const n = nextHand(state)
    expect(n.phase).toBe('passing')
    expect(n.handNumber).toBe(state.handNumber + 1)
  })

  it('confirmPassForSeat lets two humans confirm without rotating whoseTurn', () => {
    let s = dealHand(startNewGame(createInitialState()))
    s = {
      ...s,
      players: {
        ...s.players,
        0: { ...s.players[0], isHuman: true, selectedPass: [] },
        1: { ...s.players[1], isHuman: false },
        2: { ...s.players[2], isHuman: true, selectedPass: [] },
        3: { ...s.players[3], isHuman: false },
      },
    }
    const n = s.rules.passCount
    const ai1 = choosePassCards(s.players[1].hand, 'medium', n, () => 0.1)
    const ai3 = choosePassCards(s.players[3].hand, 'medium', n, () => 0.1)
    s = { ...s, passSelections: { 1: ai1, 3: ai3 }, phase: 'passing' }
    for (const card of s.players[0].hand.slice(0, n)) {
      s = togglePassCardForSeat(s, 0, card)
    }
    s = confirmPassForSeat(s, 0)
    expect(s.phase).toBe('passing')
    expect(s.whoseTurn).not.toBe(2)
    for (const card of s.players[2].hand.slice(0, n)) {
      s = togglePassCardForSeat(s, 2, card)
    }
    s = confirmPassForSeat(s, 2)
    expect(['receiving', 'playing']).toContain(s.phase)
  })

  it('acceptReceivedForSeat lets one human accept without walking the other', () => {
    let s = dealHand(startNewGame(createInitialState()))
    s = {
      ...s,
      players: {
        ...s.players,
        0: { ...s.players[0], isHuman: true, selectedPass: [] },
        1: { ...s.players[1], isHuman: false },
        2: { ...s.players[2], isHuman: true, selectedPass: [] },
        3: { ...s.players[3], isHuman: false },
      },
    }
    const n = s.rules.passCount
    const ai1 = choosePassCards(s.players[1].hand, 'medium', n, () => 0.1)
    const ai3 = choosePassCards(s.players[3].hand, 'medium', n, () => 0.1)
    s = { ...s, passSelections: { 1: ai1, 3: ai3 }, phase: 'passing' }
    for (const card of s.players[0].hand.slice(0, n)) {
      s = togglePassCardForSeat(s, 0, card)
    }
    s = confirmPassForSeat(s, 0)
    for (const card of s.players[2].hand.slice(0, n)) {
      s = togglePassCardForSeat(s, 2, card)
    }
    s = confirmPassForSeat(s, 2)
    if (s.phase === 'receiving') {
      const whose = s.whoseTurn
      s = acceptReceivedForSeat(s, 0)
      expect(s.phase).toBe('receiving')
      expect(s.whoseTurn).toBe(whose)
      expect(s.pendingReceives[0]).toBeUndefined()
      expect(s.pendingReceives[2]?.length).toBe(n)
      s = acceptReceivedForSeat(s, 2)
      expect(s.phase).toBe('playing')
    }
  })
})
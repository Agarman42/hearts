import { describe, expect, it } from 'vitest'
import { getLegalForHuman } from '../games/euchre/engine'
import { RoomSession } from './roomSession'

function startHumanFillAiEuchre() {
  const room = RoomSession.create({
    code: 'K7QM',
    gameId: 'euchre',
    hostId: 'p0',
    hostName: 'Ada',
  })
  room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
  room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
  room.handle('p0', { type: 'start' }, 0)
  return room
}

describe('RoomSession euchre loop', () => {
  it('starts euchre and lets the human act or ticks AI', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'euchre',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('euchre')
    if (bundle?.gameId === 'euchre') {
      expect(bundle.state.phase).toBe('bidding')
      expect(bundle.state.upcard).not.toBeNull()
    }
  })

  it('ticks AI through the first bidding decision', () => {
    const room = startHumanFillAiEuchre()
    const before = room.debugBundle()
    expect(before?.gameId).toBe('euchre')
    if (before?.gameId !== 'euchre') throw new Error('no bundle')
    expect(before.state.phase).toBe('bidding')
    const turn = before.state.whoseTurn
    expect(turn).not.toBeNull()
    expect(before.state.players[turn!].isHuman).toBe(false)

    const passed = before.state.passedThisRound.length
    room.tick(1000)
    const after = room.debugBundle()
    expect(after?.gameId).toBe('euchre')
    if (after?.gameId !== 'euchre') throw new Error('no bundle')
    const decided =
      after.state.phase !== 'bidding' ||
      after.state.whoseTurn !== turn ||
      after.state.passedThisRound.length > passed ||
      after.state.trump != null
    expect(decided).toBe(true)
  })

  it('auto-acks trump / discard / loner after the recap delay', () => {
    const room = startHumanFillAiEuchre()
    let now = 0
    let seq = 0
    const occupantOf = (seat: 0 | 1 | 2 | 3) => room.debugLobby().chairs[seat]

    for (let i = 0; i < 80; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'euchre') throw new Error('no bundle')
      const { state } = bundle
      if (state.awaitingTrumpAck || state.awaitingDiscardAck || state.awaitingLonerAck) {
        now += 3000
        room.tick(now)
        const acked = room.debugBundle()
        expect(acked?.gameId).toBe('euchre')
        if (acked?.gameId !== 'euchre') throw new Error('no bundle')
        expect(acked.state.awaitingTrumpAck).toBe(false)
        expect(acked.state.awaitingDiscardAck).toBe(false)
        expect(acked.state.awaitingLonerAck).toBe(false)
        return
      }
      if (state.phase !== 'bidding') break
      const turn = state.whoseTurn
      if (turn == null) break
      const occupant = occupantOf(turn)
      if (occupant) {
        seq += 1
        room.handle(
          occupant.playerId,
          { type: 'game_action', action: { type: 'order_up' }, clientSeq: seq },
          now,
        )
      } else {
        now += 1000
        room.tick(now)
      }
    }

    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('euchre')
    if (bundle?.gameId !== 'euchre') throw new Error('no bundle')
    expect(
      bundle.state.awaitingTrumpAck ||
        bundle.state.awaitingDiscardAck ||
        bundle.state.awaitingLonerAck ||
        bundle.state.phase !== 'bidding',
    ).toBe(true)
  })

  it('plays through a hand to hand_result and recap deals the next hand', () => {
    const room = startHumanFillAiEuchre()
    let now = 0
    let seq = 0
    const occupantOf = (seat: 0 | 1 | 2 | 3) => room.debugLobby().chairs[seat]

    for (let i = 0; i < 250; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'euchre') throw new Error('no bundle')
      const { state } = bundle
      if (state.phase === 'hand_result' || state.phase === 'game_over') break

      if (state.awaitingTrumpAck || state.awaitingDiscardAck || state.awaitingLonerAck) {
        now += 3000
        room.tick(now)
        continue
      }
      if (state.phase === 'trick_reveal') {
        now += 1200
        room.tick(now)
        continue
      }

      const turn = state.whoseTurn
      if (turn == null) break
      const occupant = occupantOf(turn)
      if (!occupant) {
        now += 1000
        room.tick(now)
        continue
      }

      if (state.phase === 'bidding') {
        seq += 1
        if (state.biddingRound === 1) {
          room.handle(
            occupant.playerId,
            { type: 'game_action', action: { type: 'pass_bid' }, clientSeq: seq },
            now,
          )
          const afterPass = room.debugBundle()
          if (
            afterPass?.gameId === 'euchre' &&
            afterPass.state.whoseTurn === turn &&
            afterPass.state.phase === 'bidding'
          ) {
            const suit = (['hearts', 'diamonds', 'clubs', 'spades'] as const).find(
              (s) => s !== afterPass.state.turnedDownSuit,
            )!
            seq += 1
            room.handle(
              occupant.playerId,
              { type: 'game_action', action: { type: 'name_trump', suit }, clientSeq: seq },
              now,
            )
          }
        } else {
          const suit = (['hearts', 'diamonds', 'clubs', 'spades'] as const).find(
            (s) => s !== state.turnedDownSuit,
          )!
          room.handle(
            occupant.playerId,
            { type: 'game_action', action: { type: 'name_trump', suit }, clientSeq: seq },
            now,
          )
        }
        continue
      }

      if (state.phase === 'discard') {
        const legal = getLegalForHuman(state, turn)
        expect(legal.length).toBeGreaterThan(0)
        seq += 1
        room.handle(
          occupant.playerId,
          { type: 'game_action', action: { type: 'discard', cardId: legal[0]!.id }, clientSeq: seq },
          now,
        )
        continue
      }

      if (state.phase === 'loner_choice') {
        seq += 1
        room.handle(
          occupant.playerId,
          { type: 'game_action', action: { type: 'with_partner' }, clientSeq: seq },
          now,
        )
        continue
      }

      if (state.phase === 'playing') {
        const legal = getLegalForHuman(state, turn)
        expect(legal.length).toBeGreaterThan(0)
        seq += 1
        room.handle(
          occupant.playerId,
          { type: 'game_action', action: { type: 'play_card', cardId: legal[0]!.id }, clientSeq: seq },
          now,
        )
        continue
      }
      break
    }

    const afterPlay = room.debugBundle()
    expect(afterPlay?.gameId).toBe('euchre')
    if (afterPlay?.gameId !== 'euchre') throw new Error('no bundle')
    expect(afterPlay.state.phase).toBe('hand_result')
    expect(afterPlay.state.completedTricks.length).toBe(5)

    const handBefore = afterPlay.state.handNumber
    now += 3000
    room.tick(now)
    const afterRecap = room.debugBundle()
    expect(afterRecap?.gameId).toBe('euchre')
    if (afterRecap?.gameId !== 'euchre') throw new Error('no bundle')
    expect(afterRecap.state.handNumber).toBe(handBefore + 1)
    expect(afterRecap.state.phase).toBe('bidding')
  })
})

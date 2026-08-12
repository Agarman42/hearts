import { describe, expect, it } from 'vitest'
import { getLegalForHuman } from '../games/spades/engine'
import { RoomSession } from './roomSession'

function startTwoHumanRoom() {
  const room = RoomSession.create({
    code: 'K7QM',
    gameId: 'spades',
    hostId: 'p0',
    hostName: 'Ada',
  })
  room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
  room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
  room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
  room.handle('p1', { type: 'vote_fill_ai', approve: true }, 0)
  room.handle('p0', { type: 'start' }, 0)
  return room
}

describe('RoomSession spades loop', () => {
  it('two humans + two AI can bid', () => {
    const room = startTwoHumanRoom()
    // Drive AI bids / human bids until phase is playing
    let now = 0
    for (let i = 0; i < 20; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'spades') throw new Error('no bundle')
      if (bundle.state.phase === 'playing') break
      const turn = bundle.state.whoseTurn
      if (turn == null) break
      const occupant = room.debugLobby().chairs[turn]
      if (occupant) {
        room.handle(occupant.playerId, {
          type: 'game_action',
          action: { type: 'submit_bid', bid: 3 },
          clientSeq: i + 1,
        }, now)
      } else {
        now += 1000
        room.tick(now)
      }
    }
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('spades')
    if (bundle?.gameId === 'spades') expect(bundle.state.phase).toBe('playing')
  })

  it('two humans + two AI play until hand_result and recap deals the next hand', () => {
    const room = startTwoHumanRoom()
    let now = 0
    let seq = 0
    let tricks = 0

    for (let i = 0; i < 200; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'spades') throw new Error('no bundle')
      const { state } = bundle
      if (state.phase === 'hand_result') break
      if (state.phase === 'trick_reveal') {
        now += 1200
        room.tick(now)
        tricks = Math.max(tricks, state.completedTricks.length)
        continue
      }
      if (state.phase === 'bidding') {
        const turn = state.whoseTurn
        if (turn == null) break
        const occupant = room.debugLobby().chairs[turn]
        if (occupant) {
          seq += 1
          room.handle(occupant.playerId, {
            type: 'game_action',
            action: { type: 'submit_bid', bid: 3 },
            clientSeq: seq,
          }, now)
        } else {
          now += 1000
          room.tick(now)
        }
        continue
      }
      if (state.phase === 'playing') {
        const turn = state.whoseTurn
        if (turn == null) break
        const occupant = room.debugLobby().chairs[turn]
        if (occupant) {
          const legal = getLegalForHuman(state, turn)
          expect(legal.length).toBeGreaterThan(0)
          seq += 1
          room.handle(occupant.playerId, {
            type: 'game_action',
            action: { type: 'play_card', cardId: legal[0]!.id },
            clientSeq: seq,
          }, now)
        } else {
          now += 1000
          room.tick(now)
        }
        continue
      }
      break
    }

    const afterPlay = room.debugBundle()
    expect(afterPlay?.gameId).toBe('spades')
    if (afterPlay?.gameId !== 'spades') throw new Error('no bundle')
    expect(afterPlay.state.phase === 'hand_result' || afterPlay.state.completedTricks.length >= 4).toBe(
      true,
    )
    expect(afterPlay.state.phase).toBe('hand_result')
    expect(afterPlay.state.completedTricks.length).toBe(13)
    expect(tricks).toBeGreaterThanOrEqual(4)

    const handBefore = afterPlay.state.handNumber
    now += 3000
    room.tick(now)
    const afterRecap = room.debugBundle()
    expect(afterRecap?.gameId).toBe('spades')
    if (afterRecap?.gameId !== 'spades') throw new Error('no bundle')
    expect(afterRecap.state.handNumber).toBe(handBefore + 1)
    expect(afterRecap.state.phase === 'bidding' || afterRecap.state.phase === 'playing').toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { getLegalForHuman } from '../games/hearts/engine'
import { RoomSession } from './roomSession'

function startTwoHumanHeartsRoom() {
  const room = RoomSession.create({
    code: 'H4TS',
    gameId: 'hearts',
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

describe('RoomSession hearts loop', () => {
  it('fills AI pass selections on deal and lets both humans confirm in any order', () => {
    const room = startTwoHumanHeartsRoom()
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('hearts')
    if (bundle?.gameId !== 'hearts') throw new Error('no bundle')
    expect(bundle.state.phase === 'passing' || bundle.state.phase === 'playing').toBe(true)

    if (bundle.state.phase === 'playing') return

    for (const seat of [0, 1, 2, 3] as const) {
      if (!bundle.state.players[seat].isHuman) {
        expect(bundle.state.passSelections[seat]?.length).toBe(bundle.state.rules.passCount)
      }
    }

    const humans = ([0, 1, 2, 3] as const).filter((s) => bundle.state.players[s].isHuman)
    expect(humans.length).toBe(2)
    const first = humans[0]!
    const second = humans[1]!
    const occupantOf = (seat: 0 | 1 | 2 | 3) => room.debugLobby().chairs[seat]
    const n = bundle.state.rules.passCount

    const firstHand = bundle.state.players[first].hand.slice(0, n)
    let seq = 0
    for (const card of firstHand) {
      seq += 1
      room.handle(
        occupantOf(first)!.playerId,
        {
          type: 'game_action',
          action: { type: 'toggle_pass_card', cardId: card.id },
          clientSeq: seq,
        },
        0,
      )
    }
    seq += 1
    room.handle(
      occupantOf(first)!.playerId,
      { type: 'game_action', action: { type: 'confirm_pass' }, clientSeq: seq },
      0,
    )
    const afterFirst = room.debugBundle()
    expect(afterFirst?.gameId).toBe('hearts')
    if (afterFirst?.gameId !== 'hearts') throw new Error('no bundle')
    expect(afterFirst.state.phase).toBe('passing')
    expect(afterFirst.state.whoseTurn).not.toBe(second)

    const secondHand = afterFirst.state.players[second].hand.slice(0, n)
    for (const card of secondHand) {
      seq += 1
      room.handle(
        occupantOf(second)!.playerId,
        {
          type: 'game_action',
          action: { type: 'toggle_pass_card', cardId: card.id },
          clientSeq: seq,
        },
        0,
      )
    }
    seq += 1
    room.handle(
      occupantOf(second)!.playerId,
      { type: 'game_action', action: { type: 'confirm_pass' }, clientSeq: seq },
      0,
    )
    const afterBoth = room.debugBundle()
    expect(afterBoth?.gameId).toBe('hearts')
    if (afterBoth?.gameId !== 'hearts') throw new Error('no bundle')
    expect(['receiving', 'playing']).toContain(afterBoth.state.phase)
  })

  it('two humans + two AI pass, play until hand_result, and recap deals the next hand', () => {
    const room = startTwoHumanHeartsRoom()
    let now = 0
    let seq = 0
    const occupantOf = (seat: 0 | 1 | 2 | 3) => room.debugLobby().chairs[seat]

    for (let i = 0; i < 250; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'hearts') throw new Error('no bundle')
      const { state } = bundle
      if (state.phase === 'hand_result') break

      if (state.phase === 'trick_reveal') {
        now += 1200
        room.tick(now)
        continue
      }

      if (state.phase === 'passing') {
        for (const seat of [0, 1, 2, 3] as const) {
          if (!state.players[seat].isHuman) continue
          if (state.passSelections[seat]?.length === state.rules.passCount) continue
          const occ = occupantOf(seat)
          if (!occ) continue
          const picks = state.players[seat].hand.slice(0, state.rules.passCount)
          for (const card of picks) {
            seq += 1
            room.handle(
              occ.playerId,
              {
                type: 'game_action',
                action: { type: 'toggle_pass_card', cardId: card.id },
                clientSeq: seq,
              },
              now,
            )
          }
          seq += 1
          room.handle(
            occ.playerId,
            { type: 'game_action', action: { type: 'confirm_pass' }, clientSeq: seq },
            now,
          )
        }
        continue
      }

      if (state.phase === 'receiving') {
        for (const seat of [0, 1, 2, 3] as const) {
          if (!state.players[seat].isHuman) continue
          if (!state.pendingReceives[seat]?.length && !(state.whoseTurn === seat && state.receivedCards.length)) {
            continue
          }
          const occ = occupantOf(seat)
          if (!occ) continue
          seq += 1
          room.handle(
            occ.playerId,
            { type: 'game_action', action: { type: 'accept_received' }, clientSeq: seq },
            now,
          )
        }
        continue
      }

      if (state.phase === 'playing') {
        const turn = state.whoseTurn
        if (turn == null) break
        const occupant = occupantOf(turn)
        if (occupant) {
          const legal = getLegalForHuman(state, turn)
          expect(legal.length).toBeGreaterThan(0)
          seq += 1
          room.handle(
            occupant.playerId,
            {
              type: 'game_action',
              action: { type: 'play_card', cardId: legal[0]!.id },
              clientSeq: seq,
            },
            now,
          )
        } else {
          now += 1000
          room.tick(now)
        }
        continue
      }
      break
    }

    const afterPlay = room.debugBundle()
    expect(afterPlay?.gameId).toBe('hearts')
    if (afterPlay?.gameId !== 'hearts') throw new Error('no bundle')
    expect(afterPlay.state.phase).toBe('hand_result')
    expect(afterPlay.state.completedTricks.length).toBe(13)

    const handBefore = afterPlay.state.handNumber
    now += 3000
    room.tick(now)
    const afterRecap = room.debugBundle()
    expect(afterRecap?.gameId).toBe('hearts')
    if (afterRecap?.gameId !== 'hearts') throw new Error('no bundle')
    expect(afterRecap.state.handNumber).toBe(handBefore + 1)
    expect(['passing', 'playing', 'receiving']).toContain(afterRecap.state.phase)
  })
})

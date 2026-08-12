import { describe, expect, it } from 'vitest'
import { getLegalForHuman } from '../games/spades/engine'
import { RoomSession } from './roomSession'

describe('disconnect', () => {
  it('frees a lobby chair after 30s', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    room.markDisconnected('p1', 1000)
    room.tick(1000 + 30_000)
    expect(room.debugLobby().chairs[1]).toBeNull()
  })

  it('reconnect before 30s keeps the chair', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const hello = room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    const joined = hello.to.find((m) => m.msg.type === 'joined')
    const token = joined?.msg.type === 'joined' ? joined.msg.token : ''
    room.markDisconnected('p1', 1000)
    room.handle('p1', { type: 'hello', token, name: 'Ben' }, 20_000)
    room.tick(1000 + 30_000)
    expect(room.debugLobby().chairs[1]?.playerId).toBe('p1')
  })

  it('replace-with-AI after 90s when remaining humans agree', () => {
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
    const seat1 = 1 as const
    room.markDisconnected('p1', 5_000)
    room.tick(5_000 + 90_000)
    room.handle('p0', { type: 'vote_replace_ai', approve: true }, 5_000 + 90_001)
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('spades')
    if (bundle?.gameId === 'spades') {
      expect(bundle.state.players[seat1].isHuman).toBe(false)
    }
  })

  it('broadcasts paused so peers see a match disconnect', () => {
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
    const out = room.markDisconnected('p1', 5_000)
    const paused = out.to.find((m) => m.msg.type === 'paused' && m.playerId === 'p0')
    expect(paused?.msg.type).toBe('paused')
    if (paused?.msg.type === 'paused') {
      expect(paused.msg.name).toBe('Ben')
      expect(paused.msg.until).toBe(5_000 + 90_000)
      expect(paused.msg.seat).toBe(1)
    }
  })

  it('reconnect before 90s clears the pause and keeps the human seat', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const hello = room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    const joined = hello.to.find((m) => m.msg.type === 'joined')
    const token = joined?.msg.type === 'joined' ? joined.msg.token : ''
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p1', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    room.markDisconnected('p1', 5_000)
    const back = room.handle('p1', { type: 'hello', token, name: 'Ben' }, 20_000)
    expect(back.to.some((m) => m.msg.type === 'snapshot' && m.playerId === 'p1')).toBe(true)
    const peerSnaps = back.to.filter((m) => m.playerId === 'p0' && m.msg.type === 'snapshot')
    expect(peerSnaps.length).toBeGreaterThan(0)
    for (const entry of peerSnaps) {
      if (entry.msg.type === 'snapshot') expect(entry.msg.paused).toBeUndefined()
    }
    expect(back.to.some((m) => m.msg.type === 'paused' && m.playerId === 'p0')).toBe(false)
    room.tick(5_000 + 90_000)
    room.handle('p0', { type: 'vote_replace_ai', approve: true }, 5_000 + 90_001)
    const bundle = room.debugBundle()
    if (bundle?.gameId === 'spades') {
      expect(bundle.state.players[1].isHuman).toBe(true)
    }
  })

  it('rejects rematch mid-hand', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    const out = room.handle('p0', { type: 'rematch' }, 1)
    const err = out.to.find((m) => m.msg.type === 'error')
    expect(err?.msg.type).toBe('error')
    if (err?.msg.type === 'error') expect(err.msg.code).toBe('illegal')
    const bundle = room.debugBundle()
    if (bundle?.gameId === 'spades') expect(bundle.state.matchComplete).toBe(false)
  })

  it('host rematch keeps chairs and deals a new hand', () => {
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
    const mid = room.handle('p0', { type: 'rematch' }, 1)
    const midErr = mid.to.find((m) => m.msg.type === 'error')
    expect(midErr?.msg.type).toBe('error')
    room.debugForceMatchOver()
    const guest = room.handle('p1', { type: 'rematch' }, 2)
    expect(guest.to.some((m) => m.msg.type === 'error')).toBe(true)
    const out = room.handle('p0', { type: 'rematch' }, 3)
    expect(out.to.some((m) => m.msg.type === 'snapshot')).toBe(true)
    expect(room.debugLobby().chairs[0]?.playerId).toBe('p0')
    expect(room.debugLobby().chairs[1]?.playerId).toBe('p1')
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('spades')
    if (bundle?.gameId === 'spades') {
      expect(bundle.state.matchComplete).toBe(false)
      expect(bundle.state.players[0].isHuman).toBe(true)
      expect(bundle.state.players[1].isHuman).toBe(true)
    }
  })

  it('replaced players stay spectators on rematch', () => {
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
    room.markDisconnected('p1', 5_000)
    room.tick(5_000 + 90_000)
    room.handle('p0', { type: 'vote_replace_ai', approve: true }, 5_000 + 90_001)
    room.debugForceMatchOver()
    room.handle('p0', { type: 'rematch' }, 6_000)
    expect(room.debugLobby().chairs[1]?.playerId).toBe('p1')
    const bundle = room.debugBundle()
    if (bundle?.gameId === 'spades') {
      expect(bundle.state.players[1].isHuman).toBe(false)
    }
  })

  it('reschedules AI after the last human reconnects during an AI turn', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    const hello = room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const joined = hello.to.find((m) => m.msg.type === 'joined')
    const token = joined?.msg.type === 'joined' ? joined.msg.token : ''
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    room.handle(
      'p0',
      { type: 'game_action', action: { type: 'submit_bid', bid: 3 }, clientSeq: 1 },
      0,
    )

    const mid = room.debugBundle()
    expect(mid?.gameId).toBe('spades')
    if (mid?.gameId !== 'spades') throw new Error('no bundle')
    const turn = mid.state.whoseTurn
    expect(turn).not.toBeNull()
    expect(mid.state.players[turn!].isHuman).toBe(false)

    room.markDisconnected('p0', 5_000)
    const back = room.handle('p0', { type: 'hello', token, name: 'Ada' }, 6_000)
    expect(back.delayMs?.kind).toBe('ai')
    expect(back.to.some((m) => m.msg.type === 'snapshot' && m.playerId === 'p0')).toBe(true)

    const frozen = room.tick(6_000)
    expect(frozen.to).toEqual([])
    const still = room.debugBundle()
    if (still?.gameId !== 'spades') throw new Error('no bundle')
    expect(still.state.whoseTurn).toBe(turn)

    const advanced = room.tick(6_000 + 1000)
    expect(advanced.to.some((m) => m.msg.type === 'snapshot')).toBe(true)
    const after = room.debugBundle()
    if (after?.gameId !== 'spades') throw new Error('no bundle')
    expect(after.state.whoseTurn).not.toBe(turn)
  })

  it('resets lastClientSeq on hello so a remounted client can apply seq 1', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    const hello = room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const joined = hello.to.find((m) => m.msg.type === 'joined')
    const token = joined?.msg.type === 'joined' ? joined.msg.token : ''
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    room.handle(
      'p0',
      { type: 'game_action', action: { type: 'submit_bid', bid: 3 }, clientSeq: 5 },
      0,
    )
    room.handle('p0', { type: 'hello', token, name: 'Ada' }, 1)

    let now = 1
    for (let i = 0; i < 40; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'spades') throw new Error('no bundle')
      if (bundle.state.phase === 'trick_reveal' || bundle.state.phase === 'hand_result') {
        now += 3000
        room.tick(now)
        continue
      }
      const turn = bundle.state.whoseTurn
      if (turn != null && bundle.state.players[turn].isHuman) break
      now += 1000
      room.tick(now)
    }

    const before = room.debugBundle()
    expect(before?.gameId).toBe('spades')
    if (before?.gameId !== 'spades') throw new Error('no bundle')
    expect(before.state.whoseTurn).toBe(0)
    const legal = getLegalForHuman(before.state, 0)
    expect(legal.length).toBeGreaterThan(0)
    const trickLen = before.state.currentTrick.length

    const out = room.handle(
      'p0',
      {
        type: 'game_action',
        action: { type: 'play_card', cardId: legal[0]!.id },
        clientSeq: 1,
      },
      now,
    )
    expect(out.to.some((m) => m.msg.type === 'error')).toBe(false)
    const after = room.debugBundle()
    expect(after?.gameId).toBe('spades')
    if (after?.gameId !== 'spades') throw new Error('no bundle')
    const played =
      after.state.currentTrick.length !== trickLen || after.state.whoseTurn !== 0
    expect(played).toBe(true)
  })

  it('closes after 10 minutes when the last human disconnects', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    room.markDisconnected('p0', 1000)
    expect(room.isClosed()).toBe(false)
    room.tick(1000 + 10 * 60_000)
    expect(room.isClosed()).toBe(true)
  })
})

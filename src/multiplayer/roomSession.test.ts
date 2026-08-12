import { describe, expect, it } from 'vitest'
import { RoomSession } from './roomSession'

describe('RoomSession', () => {
  it('create + hello returns joined token and lobby with host in seat 0', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    const out = room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const joined = out.to.find((m) => m.msg.type === 'joined')
    expect(joined?.msg.type).toBe('joined')
    const lobby = out.to.find((m) => m.msg.type === 'lobby')
    expect(lobby?.msg.type).toBe('lobby')
    if (lobby?.msg.type === 'lobby') {
      expect(lobby.msg.lobby.chairs[0]?.name).toBe('Ada')
    }
  })

  it('start after host fill-AI deals a projected snapshot with hidden hands', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    const out = room.handle('p0', { type: 'start' }, 0)
    const snap = out.to.find((m) => m.msg.type === 'snapshot')
    expect(snap).toBeTruthy()
    if (snap?.msg.type === 'snapshot' && snap.msg.view.gameId === 'spades') {
      expect(snap.msg.view.state.players[1].hand).toEqual([])
      expect(snap.msg.view.state.players[0].hand.length).toBeGreaterThan(0)
    }
  })

  it('mints a 32-char hex token on first hello', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    const out = room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const joined = out.to.find((m) => m.msg.type === 'joined')
    expect(joined?.msg.type).toBe('joined')
    if (joined?.msg.type === 'joined') {
      expect(joined.msg.token).toMatch(/^[0-9a-f]{32}$/)
      expect(joined.msg.playerId).toBe('p0')
      expect(joined.msg.seat).toBe(0)
    }
  })

  it('rejects start before unanimous fill-AI', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const out = room.handle('p0', { type: 'start' }, 0)
    const err = out.to.find((m) => m.msg.type === 'error')
    expect(err?.msg.type).toBe('error')
    if (err?.msg.type === 'error') expect(err.msg.code).toBe('cannot_start')
  })

  it('rejects unknown token after the match has started', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    const out = room.handle('p9', { type: 'hello', token: 'nope', name: 'Zoe' }, 0)
    const err = out.to.find((m) => m.msg.type === 'error')
    expect(err?.msg.type).toBe('error')
    if (err?.msg.type === 'error') expect(err.msg.code).toBe('unknown_token')
  })

  it('fill-AI seats get default names and tick plays when whoseTurn is AI', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    const dealt = room.debugBundle()
    expect(dealt?.gameId).toBe('spades')
    if (dealt?.gameId === 'spades') {
      expect(dealt.state.players[0].isHuman).toBe(true)
      expect(dealt.state.players[1].isHuman).toBe(false)
      expect(dealt.state.players[1].name).toBe('Angie')
      expect(dealt.state.players[2].name).toBe('Scott')
      expect(dealt.state.players[3].name).toBe('Heather')
    }
    const bid = room.handle(
      'p0',
      { type: 'game_action', action: { type: 'submit_bid', bid: 3 }, clientSeq: 1 },
      0,
    )
    expect(bid.delayMs?.kind).toBe('ai')
    const before = room.debugBundle()
    room.tick(1000)
    const after = room.debugBundle()
    if (after?.gameId === 'spades' && before?.gameId === 'spades') {
      expect(after.state.whoseTurn).not.toBe(before.state.whoseTurn)
    }
  })

  it('does not consume clientSeq on a failed game_action so a retry still errors', () => {
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
    const actor =
      room.debugBundle()?.gameId === 'spades' && room.debugBundle()?.state.whoseTurn === 1
        ? 'p0'
        : 'p1'
    const action = {
      type: 'game_action' as const,
      action: { type: 'submit_bid' as const, bid: 3 },
      clientSeq: 7,
    }
    const first = room.handle(actor, action, 0)
    const firstErr = first.to.find((m) => m.msg.type === 'error')
    expect(firstErr?.msg.type).toBe('error')
    if (firstErr?.msg.type === 'error') {
      expect(['not_your_turn', 'illegal']).toContain(firstErr.msg.code)
    }
    const retry = room.handle(actor, action, 0)
    const retryErr = retry.to.find((m) => m.msg.type === 'error')
    expect(retryErr?.msg.type).toBe('error')
    if (retryErr?.msg.type === 'error' && firstErr?.msg.type === 'error') {
      expect(retryErr.msg.code).toBe(firstErr.msg.code)
    }
  })
})

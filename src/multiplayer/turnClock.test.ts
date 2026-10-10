import { describe, expect, it } from 'vitest'
import type { GameId } from '../games/registry'
import { RoomSession } from './roomSession'

function start(gameId: GameId, now: number, turnClock?: 30 | 60 | 'off') {
  const room = RoomSession.create({
    code: 'K7QM',
    gameId,
    hostId: 'p0',
    hostName: 'Ada',
    ...(turnClock ? { turnClock } : {}),
  })
  room.handle('p0', { type: 'hello', name: 'Ada' }, now)
  room.handle('p0', { type: 'start' }, now)
  return room
}

function note(room: RoomSession, now: number) {
  const out = room.tick(now)
  const snap = out.to.find((entry) => entry.msg.type === 'snapshot' && entry.msg.note)
  return snap?.msg.type === 'snapshot' ? snap.msg.note : undefined
}

/** Park on the next human decision without spending the turn clock. */
function parkOnHuman(room: RoomSession, now: number): number {
  for (let i = 0; i < 40; i++) {
    const bundle = room.debugBundle()
    if (!bundle) return now
    const turn = bundle.state.whoseTurn
    const waiting =
      turn != null &&
      bundle.state.players[turn].isHuman &&
      (bundle.state.phase === 'playing' ||
        bundle.state.phase === 'bidding' ||
        bundle.state.phase === 'discard' ||
        bundle.state.phase === 'loner_choice')
    if (waiting) return now
    const out = room.tick(now)
    if (out.delayMs?.kind === 'turn_clock') return now
    now += out.delayMs && out.delayMs.ms > 0 ? out.delayMs.ms : 1
  }
  return now
}

describe('turn clock', () => {
  it('passes for a stalled Hearts seat and leaves them human', () => {
    const room = start('hearts', 1_000)
    expect(room.debugBundle()?.state.phase).toBe('passing')
    expect(note(room, 1_000 + 59_000)).toBeUndefined()
    expect(room.debugBundle()?.state.phase).toBe('passing')
    expect(note(room, 1_000 + 60_000)).toBe("Computer took Ada's turn")
    const after = room.debugBundle()
    expect(after?.gameId).toBe('hearts')
    if (after?.gameId === 'hearts') {
      expect(after.state.players[0].isHuman).toBe(true)
      expect(after.state.phase).toBe('receiving')
    }
  })

  it('accepts Hearts cards and then plays one card', () => {
    const room = start('hearts', 1_000)
    room.tick(1_000 + 60_000)
    const receiveAt = 1_000 + 60_000
    room.tick(receiveAt + 60_000)
    const parked = parkOnHuman(room, receiveAt + 60_000)
    const before = room.debugBundle()
    const seat = before?.state.whoseTurn
    expect(seat).not.toBeNull()
    const hand = seat != null ? before?.state.players[seat].hand.length : 0
    expect(note(room, parked + 60_000)).toMatch(/Computer took .+?'s turn/)
    const after = room.debugBundle()
    expect(after?.state.players[seat!].isHuman).toBe(true)
    expect(after?.state.players[seat!].hand.length).toBeLessThan(hand ?? 0)
  })

  it('bids for a stalled Spades seat', () => {
    const room = start('spades', 5_000)
    const parked = parkOnHuman(room, 5_000)
    const seat = room.debugBundle()?.state.whoseTurn
    expect(note(room, parked + 59_000)).toBeUndefined()
    expect(note(room, parked + 60_000)).toMatch(/Computer took .+?'s turn/)
    const after = room.debugBundle()
    expect(after?.gameId).toBe('spades')
    if (after?.gameId === 'spades' && seat != null) {
      expect(after.state.players[seat].isHuman).toBe(true)
      expect(after.state.bids[seat]).not.toBeNull()
    }
  })

  it('acts for a stalled Euchre seat', () => {
    const room = start('euchre', 2_000)
    const parked = parkOnHuman(room, 2_000)
    const before = room.debugBundle()
    expect(note(room, parked + 60_000)).toMatch(/Computer took .+?'s turn/)
    const after = room.debugBundle()
    expect(after?.gameId).toBe('euchre')
    if (after?.gameId === 'euchre' && before?.gameId === 'euchre') {
      const seat = before.state.whoseTurn ?? 0
      expect(after.state.players[seat].isHuman).toBe(true)
      expect(after.state.phase !== before.state.phase || after.state.whoseTurn !== before.state.whoseTurn).toBe(
        true,
      )
    }
  })

  it('uses 30 seconds when the table asks for it', () => {
    const room = start('hearts', 0, 30)
    expect(note(room, 29_000)).toBeUndefined()
    expect(note(room, 30_000)).toBe("Computer took Ada's turn")
  })

  it('does nothing when the turn limit is off', () => {
    const room = start('hearts', 0, 'off')
    expect(note(room, 10 * 60_000)).toBeUndefined()
    expect(room.debugBundle()?.state.phase).toBe('passing')
    expect(room.debugLobby().turnClock).toBe('off')
  })

  it('still plays one card if that phone has dropped', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'hearts',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 1_000)
    room.handle('p1', { type: 'hello', name: 'Ben' }, 1_000)
    room.handle('p0', { type: 'start' }, 1_000)
    room.markDisconnected('p0', 1_500)
    const out = room.tick(1_000 + 60_000)
    const snap = out.to.find((entry) => entry.playerId === 'p1' && entry.msg.type === 'snapshot')
    expect(snap?.msg.type === 'snapshot' ? snap.msg.note : undefined).toBe("Computer took Ada's turn")
    const after = room.debugBundle()
    if (after?.gameId === 'hearts') {
      expect(after.state.players[0].isHuman).toBe(true)
      expect(after.state.passSelections[0]?.length).toBe(after.state.rules.passCount)
    }
  })

  it('treats a saved room with no turn limit as 60 seconds', () => {
    const room = start('spades', 0)
    room.handle('p0', { type: 'set_turn_clock', turnClock: 'off' }, 0)
    const saved = room.toJSON()
    expect(RoomSession.fromJSON(saved).debugLobby().turnClock).toBe('off')
    const legacy = { ...saved, lobby: { ...saved.lobby, turnClock: undefined }, turnWait: undefined }
    expect(RoomSession.fromJSON(legacy).debugLobby().turnClock).toBe(60)
  })
})

import { describe, expect, it } from 'vitest'
import { canStart, createLobby, reduceLobby } from './lobby'

describe('lobby', () => {
  it('seats creator South and first joiner West', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    expect(l.chairs[0]?.playerId).toBe('p0')
    const r = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1')
    expect(r.state.chairs[1]?.playerId).toBe('p1')
    expect(r.state.chairs[2]).toBeNull()
  })

  it('resets fill-AI votes when someone sits', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'vote_fill_ai', approve: true }, 'p0').state
    expect(l.fillAiVotes['p0']).toBe(true)
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    expect(l.fillAiVotes).toEqual({})
  })

  it('cannot start with empty chairs until unanimous fill-AI', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'hearts', hostId: 'p0', hostName: 'Ada' })
    expect(canStart(l)).toBe(false)
    l = reduceLobby(l, { type: 'vote_fill_ai', approve: true }, 'p0').state
    expect(canStart(l)).toBe(true)
  })

  it('sit_relative partner claims the across chair', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    l = reduceLobby(l, { type: 'sit_relative', vsSeat: 0, relation: 'partner' }, 'p1').state
    expect(l.chairs[2]?.playerId).toBe('p1')
    expect(l.chairs[1]).toBeNull()
  })

  it('swap_request + accept exchanges two humans', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    l = reduceLobby(l, { type: 'sit', seat: 2 }, 'p1').state
    l = reduceLobby(l, { type: 'hello', name: 'Cam' }, 'p2').state
    l = reduceLobby(l, { type: 'hello', name: 'Dee' }, 'p3').state
    expect(l.chairs[0]?.playerId).toBe('p0')
    expect(l.chairs[2]?.playerId).toBe('p1')
    l = reduceLobby(l, { type: 'swap_request', withSeat: 2 }, 'p0').state
    l = reduceLobby(l, { type: 'swap_respond', accept: true }, 'p1').state
    expect(l.chairs[0]?.playerId).toBe('p1')
    expect(l.chairs[2]?.playerId).toBe('p0')
  })

  it('locks chairs after successful start', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    l = reduceLobby(l, { type: 'hello', name: 'Cam' }, 'p2').state
    l = reduceLobby(l, { type: 'hello', name: 'Dee' }, 'p3').state
    const started = reduceLobby(l, { type: 'start' }, 'p0')
    expect(started.error).toBeUndefined()
    expect(started.state.phase).toBe('starting')
    l = started.state
    const before = { ...l.chairs }
    const sit = reduceLobby(l, { type: 'sit', seat: 2 }, 'p1')
    expect(sit.error?.code).toMatch(/not_in_lobby|cannot_start/)
    expect(sit.state.chairs).toEqual(before)
    expect(sit.state.chairs[1]?.playerId).toBe('p1')
  })
})

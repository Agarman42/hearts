import { describe, expect, it } from 'vitest'
import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import { DEFAULT_EUCHRE_RULES } from '../games/euchre/types'
import { DEFAULT_HEARTS_RULES } from '../games/hearts/types'
import { DEFAULT_SPADES_RULES } from '../games/spades/types'
import type { GameId } from '../games/registry'
import type { GameBundle } from './protocol'
import { RoomSession } from './roomSession'

const MATCHES = 500

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function assertSane(bundle: GameBundle) {
  const ids = new Set<string>()
  const take = (id: string) => {
    expect(ids.has(id), `duplicate card ${id} in ${bundle.gameId}`).toBe(false)
    ids.add(id)
  }
  const cap = bundle.gameId === 'euchre' ? 6 : 13
  for (const seat of SEATS) {
    const hand = bundle.state.players[seat].hand
    expect(hand.length).toBeLessThanOrEqual(cap)
    for (const card of hand) take(card.id)
  }
  for (const play of bundle.state.currentTrick) take(play.card.id)
  for (const trick of bundle.state.completedTricks) {
    for (const play of trick.plays) take(play.card.id)
  }
  const turn = bundle.state.whoseTurn
  if (turn != null) expect([0, 1, 2, 3]).toContain(turn)
}

function signature(bundle: GameBundle): string {
  const hands = SEATS.map((seat: Seat) => bundle.state.players[seat].hand.length).join('')
  return `${bundle.gameId}:${bundle.state.phase}:${bundle.state.handNumber}:${bundle.state.whoseTurn}:${hands}:${bundle.state.currentTrick.length}`
}

function rulesFor(gameId: GameId) {
  if (gameId === 'hearts') return { gameId, hearts: { ...DEFAULT_HEARTS_RULES, raceTo: 1 } } as const
  if (gameId === 'spades') return { gameId, spades: { ...DEFAULT_SPADES_RULES, raceTo: 1 } } as const
  return { gameId, euchre: { ...DEFAULT_EUCHRE_RULES, raceTo: 1 } } as const
}

function playMatch(gameId: GameId, seed: number) {
  const rng = mulberry32(seed)
  const room = RoomSession.create({
    code: 'SOAK',
    gameId,
    hostId: 'p0',
    hostName: 'Ada',
    turnClock: 30,
    rules: rulesFor(gameId),
  })
  const hello = room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
  const joined = hello.to.find((entry) => entry.msg.type === 'joined')
  const token = joined?.msg.type === 'joined' ? joined.msg.token : ''
  room.handle('p0', { type: 'start' }, 0)
  room.debugForceAllBots()
  let now = 0
  let stall = 0
  let last = ''
  for (let step = 0; step < 8000; step++) {
    expect(room.isClosed(), `${gameId} closed early seed ${seed}`).toBe(false)
    if (rng() < 0.05) room.markDisconnected('p0', now)
    if (rng() < 0.05) {
      room.handle('p0', { type: 'hello', name: 'Ada', token }, now)
    }
    room.debugForceAllBots()
    const out = room.tick(now)
    const bundle = room.debugBundle()
    if (!bundle) throw new Error(`${gameId} lost its match seed ${seed}`)
    assertSane(bundle)
    const sig = signature(bundle)
    if (sig === last && out.to.length === 0) stall += 1
    else stall = 0
    expect(stall, `${gameId} stalled on ${sig} seed ${seed}`).toBeLessThan(8)
    last = sig
    if (bundle.state.matchComplete || bundle.state.phase === 'game_over') return
    const jump = out.delayMs?.ms ?? 0
    now += jump > 0 ? jump : 1
    expect(now, `${gameId} ran long seed ${seed}`).toBeLessThan(9 * 60_000)
  }
  throw new Error(`${gameId} did not finish seed ${seed}`)
}

describe('turn clock soak', () => {
  it(
    'finishes 500 bot matches with random disconnects and no illegal cards',
    () => {
      const games: GameId[] = ['hearts', 'spades', 'euchre']
      for (let i = 0; i < MATCHES; i++) {
        playMatch(games[i % games.length]!, 1000 + i)
      }
    },
    180_000,
  )
})

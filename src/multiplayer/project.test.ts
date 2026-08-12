import { describe, expect, it } from 'vitest'
import {
  createInitialState as createHearts,
  dealHand as dealHearts,
  startNewGame as startHearts,
} from '../games/hearts/engine'
import {
  createInitialState as createEuchre,
  dealHand as dealEuchre,
  startNewGame as startEuchre,
} from '../games/euchre/engine'
import {
  createInitialState as createSpades,
  dealHand as dealSpades,
  startNewGame as startSpades,
} from '../games/spades/engine'
import { projectForSeat } from './project'

function assertNoForeignCardIds(blob: string, foreignIds: string[]) {
  for (const id of foreignIds) {
    expect(blob.includes(JSON.stringify(id)) || blob.includes(id)).toBe(false)
  }
}

describe('projectForSeat', () => {
  it("never includes another seat's card ids (spades)", () => {
    let s = dealSpades(startSpades(createSpades()))
    const mine = new Set(s.players[0].hand.map((c) => c.id))
    const foreign = [1, 2, 3].flatMap((seat) =>
      s.players[seat as 1 | 2 | 3].hand.map((c) => c.id),
    )
    const view = projectForSeat({ gameId: 'spades', state: s }, 0)
    const blob = JSON.stringify(view)
    for (const id of foreign) expect(blob.includes(JSON.stringify(id)) || blob.includes(id)).toBe(false)
    expect(view.gameId).toBe('spades')
    if (view.gameId === 'spades') {
      expect(view.state.players[0].hand.map((c) => c.id).sort()).toEqual([...mine].sort())
      expect(view.state.players[1].hand).toEqual([])
      expect(view.state.players[1].cardCount).toBe(s.players[1].hand.length)
    }
  })

  it("never includes another seat's card ids (hearts)", () => {
    let s = dealHearts(startHearts(createHearts()))
    const foreign = [1, 2, 3].flatMap((seat) =>
      s.players[seat as 1 | 2 | 3].hand.map((c) => c.id),
    )
    const view = projectForSeat({ gameId: 'hearts', state: s }, 0)
    assertNoForeignCardIds(JSON.stringify(view), foreign)
    expect(view.gameId).toBe('hearts')
    if (view.gameId === 'hearts') {
      expect(view.state.players[1].hand).toEqual([])
      expect(view.state.players[1].cardCount).toBe(s.players[1].hand.length)
    }
  })

  it('hides hearts pass selections and selectedPass for other seats', () => {
    let s = dealHearts(startHearts(createHearts()))
    const passCards = s.players[1].hand.slice(0, 3)
    s = {
      ...s,
      phase: 'passing',
      passSelections: { 1: passCards },
      players: {
        ...s.players,
        1: { ...s.players[1], selectedPass: passCards },
      },
    }
    const leaked = passCards.map((c) => c.id)
    const view = projectForSeat({ gameId: 'hearts', state: s }, 0)
    assertNoForeignCardIds(JSON.stringify(view), leaked)
    if (view.gameId === 'hearts') {
      expect(view.state.players[1].selectedPass).toEqual([])
      expect(view.state.passSelections[1]).toBeUndefined()
    }
  })

  it("never includes another seat's card ids (euchre)", () => {
    let s = dealEuchre(startEuchre(createEuchre()))
    const foreign = [1, 2, 3].flatMap((seat) =>
      s.players[seat as 1 | 2 | 3].hand.map((c) => c.id),
    )
    // Kitty cards beyond upcard should not leak as opponent hands; still project carefully
    const view = projectForSeat({ gameId: 'euchre', state: s }, 0)
    const blob = JSON.stringify(view)
    for (const id of foreign) {
      // foreign hand cards must not appear
      expect(blob.includes(JSON.stringify(id)) || blob.includes(`"id":"${id}"`)).toBe(false)
    }
    expect(view.gameId).toBe('euchre')
    if (view.gameId === 'euchre') {
      expect(view.state.players[1].hand).toEqual([])
      expect(view.state.players[1].cardCount).toBe(s.players[1].hand.length)
    }
  })
})

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
import { isYouName } from './identity'
import { projectForSeat, sanitizeProjectedView } from './project'

function assertNoForeignCardIds(blob: string, foreignIds: string[]) {
  for (const id of foreignIds) {
    expect(blob.includes(JSON.stringify(id)) || blob.includes(id)).toBe(false)
  }
}

describe('projectForSeat', () => {
  it("never includes another seat's card ids (spades)", () => {
    const s = dealSpades(startSpades(createSpades()))
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
    const s = dealHearts(startHearts(createHearts()))
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
    const s = dealEuchre(startEuchre(createEuchre()))
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

  it('does not leak buried euchre kitty card ids during bidding', () => {
    const s = dealEuchre(startEuchre(createEuchre()))
    expect(s.phase).toBe('bidding')
    expect(s.upcard).not.toBeNull()
    expect(s.kitty.length).toBeGreaterThan(1)
    const buried = s.kitty.filter((c) => c.id !== s.upcard!.id).map((c) => c.id)
    expect(buried.length).toBeGreaterThan(0)
    const view = projectForSeat({ gameId: 'euchre', state: s }, 0)
    const blob = JSON.stringify(view)
    for (const id of buried) {
      expect(blob.includes(JSON.stringify(id)) || blob.includes(id)).toBe(false)
    }
    expect(view.gameId).toBe('euchre')
    if (view.gameId === 'euchre') {
      expect(view.state.kitty).toEqual([])
      expect(view.state.upcard?.id).toBe(s.upcard!.id)
    }
  })

  it('euchre projection hides kitty cards that are not the upcard', () => {
    const s = dealEuchre(startEuchre(createEuchre()))
    const hidden = s.kitty.filter((c) => c.id !== s.upcard?.id).map((c) => c.id)
    const view = projectForSeat({ gameId: 'euchre', state: s }, 0)
    const blob = JSON.stringify(view)
    for (const id of hidden) expect(blob.includes(id)).toBe(false)
    if (s.upcard) expect(blob.includes(s.upcard.id)).toBe(true)
  })

  it('hides euchre pickedUpCard unless viewer is the dealer in discard', () => {
    let s = dealEuchre(startEuchre(createEuchre()))
    const up = s.upcard!
    const dealer = s.dealer
    s = {
      ...s,
      phase: 'discard',
      whoseTurn: dealer,
      pickedUpCard: up,
      upcard: null,
      players: {
        ...s.players,
        [dealer]: { ...s.players[dealer], hand: [...s.players[dealer].hand, up] },
      },
    }
    const dealerView = projectForSeat({ gameId: 'euchre', state: s }, dealer)
    expect(dealerView.gameId).toBe('euchre')
    if (dealerView.gameId === 'euchre') {
      expect(dealerView.state.pickedUpCard?.id).toBe(up.id)
    }
    const other = ((dealer + 1) % 4) as 0 | 1 | 2 | 3
    const otherView = projectForSeat({ gameId: 'euchre', state: s }, other)
    expect(otherView.gameId).toBe('euchre')
    if (otherView.gameId === 'euchre') {
      expect(otherView.state.pickedUpCard).toBeNull()
    }
    const blob = JSON.stringify(otherView)
    expect(blob.includes(up.id)).toBe(false)
  })

  it('follows the viewer for You / duplicate Scott labels', () => {
    const s = dealEuchre(startEuchre(createEuchre()))
    s.players[0].name = 'You'
    s.players[1].name = 'Scott'
    s.players[3].name = 'Scott'
    const hostAtEast = projectForSeat({ gameId: 'euchre', state: s }, 3)
    expect(hostAtEast.gameId).toBe('euchre')
    if (hostAtEast.gameId === 'euchre') {
      expect(hostAtEast.state.players[3].name).toBe('Scott')
      expect(hostAtEast.state.players[1].name).toBe('Scott 2')
      expect(hostAtEast.state.players[0].name).not.toBe('You')
    }
  })

  it('after partner swap, projected names never keep You on non-viewer seats', () => {
    const s = dealEuchre(startEuchre(createEuchre()))
    s.players[0].name = 'You'
    s.players[1].name = 'Scott'
    s.players[2].name = 'Heather'
    s.players[3].name = 'Scott'
    s.warning = 'You passes.'
    const view = projectForSeat({ gameId: 'euchre', state: s }, 3)
    expect(view.gameId).toBe('euchre')
    if (view.gameId === 'euchre') {
      expect(view.state.players[3].name).toBe('Scott')
      expect(isYouName(view.state.players[0].name)).toBe(false)
      expect(isYouName(view.state.players[1].name)).toBe(false)
      expect(isYouName(view.state.players[2].name)).toBe(false)
      expect(view.state.warning).not.toMatch(/\bYou\b/)
      expect(view.state.warning).toBe('Jules passes.')
    }
  })

  it('sanitizeProjectedView strips leftover You from an old-worker snapshot', () => {
    const s = dealEuchre(startEuchre(createEuchre()))
    const stale = projectForSeat({ gameId: 'euchre', state: s }, 3)
    expect(stale.gameId).toBe('euchre')
    if (stale.gameId !== 'euchre') return
    stale.state.players[0] = { ...stale.state.players[0], name: 'You' }
    stale.state.warning = 'You passes.'
    const cleaned = sanitizeProjectedView(stale)
    expect(cleaned.gameId).toBe('euchre')
    if (cleaned.gameId === 'euchre') {
      expect(isYouName(cleaned.state.players[0].name)).toBe(false)
      expect(cleaned.state.players[3].name).not.toBe('You')
      expect(cleaned.state.warning).toBe('Jules passes.')
    }
  })

  it('relabels euchre Us/Them engine copy for an EW viewer', () => {
    const s = dealEuchre(startEuchre(createEuchre()))
    s.message = 'Us euchre!'
    const ew = projectForSeat({ gameId: 'euchre', state: s }, 3)
    expect(ew.gameId).toBe('euchre')
    if (ew.gameId === 'euchre') {
      expect(ew.state.message).toBe('Them euchre!')
    }
    const ns = projectForSeat({ gameId: 'euchre', state: s }, 0)
    expect(ns.gameId).toBe('euchre')
    if (ns.gameId === 'euchre') {
      expect(ns.state.message).toBe('Us euchre!')
    }
  })
})

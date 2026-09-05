import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import type { Card } from '../core/types'
import type { GameBundle, ProjectedState } from './protocol'
import { displayNamesForViewer, isYouName, nextUnusedName } from './identity'
import { partnershipOf } from '../core/partnership'
import { relabelUsThemCopy } from '../core/teamLabels'

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function withCardCounts<P extends { hand: Card[] }>(
  players: Record<Seat, P>,
  viewer: Seat,
): Record<Seat, P & { cardCount: number; hand: Card[] }> {
  const out = {} as Record<Seat, P & { cardCount: number; hand: Card[] }>
  for (const seat of SEATS) {
    const p = players[seat]
    const cardCount = p.hand.length
    if (seat === viewer) {
      out[seat] = { ...p, hand: [...p.hand], cardCount }
    } else {
      out[seat] = { ...p, hand: [], cardCount }
    }
  }
  return out
}

function withViewerNames<P extends { name: string }>(
  players: Record<Seat, P>,
  viewer: Seat,
): Record<Seat, P> {
  const raw = {} as Record<Seat, string>
  for (const seat of SEATS) raw[seat] = players[seat].name
  const shown = displayNamesForViewer(raw, viewer)
  const out = {} as Record<Seat, P>
  for (const seat of SEATS) {
    let name = shown[seat]
    if (seat !== viewer && isYouName(name)) {
      name = nextUnusedName(
        'Jules',
        SEATS.map((s) => (s === seat ? '' : shown[s])),
      )
    }
    out[seat] = name === players[seat].name ? players[seat] : { ...players[seat], name }
  }
  return out
}

export function projectForSeat(bundle: GameBundle, viewer: Seat): ProjectedState {
  if (bundle.gameId === 'spades') {
    const state = cloneJson(bundle.state)
    const players = withCardCounts(withViewerNames(state.players, viewer), viewer)
    return {
      gameId: 'spades',
      viewerSeat: viewer,
      state: { ...state, players },
    }
  }

  if (bundle.gameId === 'euchre') {
    const state = cloneJson(bundle.state)
    const players = withCardCounts(withViewerNames(state.players, viewer), viewer)
    // Public face only: never project face-down buried kitty card ids.
    // Engine keeps a 4-card kitty during bidding; only `upcard` is visible.
    const showPickup = state.phase === 'discard' && viewer === state.dealer
    const yourTeam = partnershipOf(viewer)
    return {
      gameId: 'euchre',
      viewerSeat: viewer,
      state: {
        ...state,
        players,
        kitty: [],
        pickedUpCard: showPickup ? state.pickedUpCard : null,
        message: state.message ? relabelUsThemCopy(state.message, yourTeam) : state.message,
      },
    }
  }

  // hearts
  const state = cloneJson(bundle.state)
  const players = withCardCounts(withViewerNames(state.players, viewer), viewer)
  for (const seat of SEATS) {
    if (seat !== viewer) {
      players[seat] = { ...players[seat], selectedPass: [] }
    }
  }

  const passSelections: Partial<Record<Seat, Card[]>> = {}
  if (state.passSelections[viewer]) {
    passSelections[viewer] = state.passSelections[viewer]
  }

  const viewerPending = state.pendingReceives[viewer]
  let receivedCards: Card[] = []
  const pendingReceives: Partial<Record<Seat, Card[]>> = {}
  if (viewerPending != null) {
    receivedCards = viewerPending
    pendingReceives[viewer] = viewerPending
  } else if (state.whoseTurn === viewer && state.receivedCards.length > 0) {
    receivedCards = state.receivedCards
  }

  return {
    gameId: 'hearts',
    viewerSeat: viewer,
    state: {
      ...state,
      players,
      passSelections,
      pendingReceives,
      receivedCards,
    },
  }
}

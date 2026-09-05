import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import type { Card } from '../core/types'
import type { GameBundle, ProjectedState } from './protocol'
import {
  applyViewerDisplayNames,
  rewriteStrippedYouCopy,
} from './identity'
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

function withViewerCopy<T extends { message?: string | null; warning?: string | null }>(
  state: T,
  rawPlayers: Record<Seat, { name: string }>,
  shownPlayers: Record<Seat, { name: string }>,
  viewer: Seat,
): T {
  const raw = {} as Record<Seat, string>
  const shown = {} as Record<Seat, string>
  for (const seat of SEATS) {
    raw[seat] = rawPlayers[seat].name
    shown[seat] = shownPlayers[seat].name
  }
  const next = { ...state }
  if ('message' in state) {
    const rewritten = rewriteStrippedYouCopy(state.message ?? null, raw, shown)
    next.message = rewritten
      ? relabelUsThemCopy(rewritten, partnershipOf(viewer))
      : rewritten
  }
  if ('warning' in state) {
    next.warning = rewriteStrippedYouCopy(state.warning ?? null, raw, shown)
  }
  return next
}

/** Client belt: old workers may still project vacated south as “You”. */
export function sanitizeProjectedView(view: ProjectedState): ProjectedState {
  if (view.gameId === 'euchre') {
    const rawPlayers = view.state.players
    const players = applyViewerDisplayNames(rawPlayers, view.viewerSeat)
    const state = withViewerCopy(view.state, rawPlayers, players, view.viewerSeat)
    return { ...view, state: { ...state, players } }
  }
  if (view.gameId === 'spades') {
    const rawPlayers = view.state.players
    const players = applyViewerDisplayNames(rawPlayers, view.viewerSeat)
    const state = withViewerCopy(view.state, rawPlayers, players, view.viewerSeat)
    return { ...view, state: { ...state, players } }
  }
  const rawPlayers = view.state.players
  const players = applyViewerDisplayNames(rawPlayers, view.viewerSeat)
  const state = withViewerCopy(view.state, rawPlayers, players, view.viewerSeat)
  return { ...view, state: { ...state, players } }
}

export function projectForSeat(bundle: GameBundle, viewer: Seat): ProjectedState {
  if (bundle.gameId === 'spades') {
    const state = cloneJson(bundle.state)
    const players = withCardCounts(state.players, viewer)
    return sanitizeProjectedView({
      gameId: 'spades',
      viewerSeat: viewer,
      state: { ...state, players },
    })
  }

  if (bundle.gameId === 'euchre') {
    const state = cloneJson(bundle.state)
    const players = withCardCounts(state.players, viewer)
    // Public face only: never project face-down buried kitty card ids.
    // Engine keeps a 4-card kitty during bidding; only `upcard` is visible.
    const showPickup = state.phase === 'discard' && viewer === state.dealer
    return sanitizeProjectedView({
      gameId: 'euchre',
      viewerSeat: viewer,
      state: {
        ...state,
        players,
        kitty: [],
        pickedUpCard: showPickup ? state.pickedUpCard : null,
      },
    })
  }

  // hearts
  const state = cloneJson(bundle.state)
  const players = withCardCounts(state.players, viewer)
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

  return sanitizeProjectedView({
    gameId: 'hearts',
    viewerSeat: viewer,
    state: {
      ...state,
      players,
      passSelections,
      pendingReceives,
      receivedCards,
    },
  })
}

/**
 * Shared card-memory helpers for hard AI.
 * Tracks what has been seen and which cards can still be out.
 */
import type { Card, Rank, Seat, Suit } from './types'
import { SEATS, SUITS } from './types'
import { makeCard, rankValue } from './cards'
import { createDeck, type DeckKind } from './deck'

export interface PlayRecord {
  seat: Seat
  card: Card
}

export interface TrickRecord {
  plays: PlayRecord[]
}

/** All card ids played this hand (completed tricks + current). */
export function collectPlayedIds(
  completed: TrickRecord[],
  current: PlayRecord[] = [],
): Set<string> {
  const ids = new Set<string>()
  for (const t of completed) {
    for (const p of t.plays) ids.add(p.card.id)
  }
  for (const p of current) ids.add(p.card.id)
  return ids
}

/**
 * Cards not in my hand and not yet played — may sit in other hands (or kitty).
 * Optionally exclude known kitty / dead cards.
 */
export function unknownCards(
  myHand: Card[],
  playedIds: Set<string>,
  deckKind: DeckKind = 'standard52',
  extraExcludedIds?: Iterable<string>,
): Card[] {
  const mine = new Set(myHand.map((c) => c.id))
  const extra = extraExcludedIds ? new Set(extraExcludedIds) : null
  return createDeck(deckKind).filter(
    (c) => !mine.has(c.id) && !playedIds.has(c.id) && !(extra?.has(c.id) ?? false),
  )
}

/** True if no higher card of the same suit remains outside my hand. */
export function isMasterInSuit(
  card: Card,
  myHand: Card[],
  playedIds: Set<string>,
  deckKind: DeckKind = 'standard52',
): boolean {
  const deck = createDeck(deckKind)
  for (const c of deck) {
    if (c.suit !== card.suit) continue
    if (rankValue(c.rank) <= rankValue(card.rank)) continue
    if (playedIds.has(c.id)) continue
    if (myHand.some((h) => h.id === c.id)) continue
    return false
  }
  return true
}

/** Highest remaining card of a suit still in play (including my hand). */
export function highestRemainingInSuit(
  suit: Suit,
  myHand: Card[],
  playedIds: Set<string>,
  deckKind: DeckKind = 'standard52',
): Card | null {
  const deck = createDeck(deckKind)
  let best: Card | null = null
  for (const c of deck) {
    if (c.suit !== suit) continue
    if (playedIds.has(c.id)) continue
    if (!best || rankValue(c.rank) > rankValue(best.rank)) best = c
  }
  // Prefer returning the instance from my hand when I hold it
  if (best) {
    const mine = myHand.find((h) => h.id === best!.id)
    if (mine) return mine
  }
  return best
}

/**
 * Seats known void in a suit: they failed to follow when that suit was led.
 */
export function detectVoids(
  completed: TrickRecord[],
  current: PlayRecord[] = [],
): Record<Seat, Set<Suit>> {
  const voids: Record<Seat, Set<Suit>> = {
    0: new Set(),
    1: new Set(),
    2: new Set(),
    3: new Set(),
  }
  const scan = (plays: PlayRecord[]) => {
    if (plays.length === 0) return
    const lead = plays[0]!.card.suit
    for (const p of plays) {
      if (p.card.suit !== lead) voids[p.seat].add(lead)
    }
  }
  for (const t of completed) scan(t.plays)
  scan(current)
  return voids
}

/** How many cards of `suit` are still unaccounted for outside my hand. */
export function unknownCountInSuit(
  suit: Suit,
  myHand: Card[],
  playedIds: Set<string>,
  deckKind: DeckKind = 'standard52',
): number {
  return unknownCards(myHand, playedIds, deckKind).filter((c) => c.suit === suit).length
}

/** True if this exact card is still unplayed and not in my hand (so an opponent may hold it). */
export function cardStillOut(
  rank: Rank,
  suit: Suit,
  myHand: Card[],
  playedIds: Set<string>,
): boolean {
  if (myHand.some((c) => c.rank === rank && c.suit === suit)) return false
  return !playedIds.has(makeCard(suit, rank).id)
}

/** Seats that have shown they can follow (or trump) — inverse helpers for AI. */
export function opponentSeats(mySeat: Seat): Seat[] {
  return SEATS.filter((s) => s !== mySeat)
}

export function countOppVoidsInSuit(
  suit: Suit,
  mySeat: Seat,
  voids: Record<Seat, Set<Suit>>,
  partnerSeat?: Seat | null,
): number {
  let n = 0
  for (const s of SEATS) {
    if (s === mySeat) continue
    if (partnerSeat != null && s === partnerSeat) continue
    if (voids[s]?.has(suit)) n += 1
  }
  return n
}

export { SUITS }

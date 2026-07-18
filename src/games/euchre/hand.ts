import { Card } from '../../core/types'
import type { Suit } from '../../core/types'
import { compareRankDesc } from '../../core/cards'
import { cardPower, effectiveSuit } from './rules'

/** Preferred order within a color (for stable groups). */
const BLACK_ORDER: readonly Suit[] = ['spades', 'clubs']
const RED_ORDER: readonly Suit[] = ['hearts', 'diamonds']

const isRedSuit = (suit: Suit): boolean => suit === 'hearts' || suit === 'diamonds'

function sortSuitsByPreference(suits: Suit[], pref: readonly Suit[]): Suit[] {
  return [...suits].sort((a, b) => pref.indexOf(a) - pref.indexOf(b))
}

/**
 * Build a left-to-right suit order that alternates black/red using only the
 * suits that actually appear in the hand (so we never get ♠…♣ with a missing
 * red suit "slot" causing two blacks in a row when a red suit is held).
 */
export function alternateColorSuitOrder(suitsPresent: Iterable<Suit>): Suit[] {
  const unique = [...new Set(suitsPresent)]
  const reds = sortSuitsByPreference(
    unique.filter(isRedSuit),
    RED_ORDER,
  )
  const blacks = sortSuitsByPreference(
    unique.filter((s) => !isRedSuit(s)),
    BLACK_ORDER,
  )
  const ordered: Suit[] = []
  // Start with black when equal or more blacks; otherwise start red so R-B-R works.
  let preferBlack = blacks.length >= reds.length
  const redQ = [...reds]
  const blackQ = [...blacks]
  while (redQ.length > 0 || blackQ.length > 0) {
    if (preferBlack && blackQ.length > 0) {
      ordered.push(blackQ.shift()!)
      preferBlack = false
    } else if (!preferBlack && redQ.length > 0) {
      ordered.push(redQ.shift()!)
      preferBlack = true
    } else if (blackQ.length > 0) {
      ordered.push(blackQ.shift()!)
      preferBlack = false
    } else {
      ordered.push(redQ.shift()!)
      preferBlack = true
    }
  }
  return ordered
}

function compareInSuitOrder(a: Card, b: Card, suitOrder: readonly Suit[]): number {
  const ai = suitOrder.indexOf(a.suit)
  const bi = suitOrder.indexOf(b.suit)
  // Unknown suits sort after known (shouldn't happen)
  const ax = ai === -1 ? 99 : ai
  const bx = bi === -1 ? 99 : bi
  if (ax !== bx) return ax - bx
  return compareRankDesc(a, b)
}

/** Black · red · black · red suit groups; trump (incl. left bower) on the left. */
export function sortEuchreHand(hand: Card[], trump: Suit | null): Card[] {
  if (!trump) {
    const order = alternateColorSuitOrder(hand.map((c) => c.suit))
    return [...hand].sort((a, b) => compareInSuitOrder(a, b, order))
  }

  const trumpCards = hand.filter((c) => effectiveSuit(c, trump) === trump)
  const offCards = hand.filter((c) => effectiveSuit(c, trump) !== trump)
  const offOrder = alternateColorSuitOrder(offCards.map((c) => c.suit))

  const sortedTrump = [...trumpCards].sort(
    (a, b) => cardPower(b, trump) - cardPower(a, trump),
  )
  const sortedOff = [...offCards].sort((a, b) => compareInSuitOrder(a, b, offOrder))
  return [...sortedTrump, ...sortedOff]
}

import { Card, Seat } from '../../core/types'
import type { Suit } from '../../core/types'
import { TrickPlay } from '../types'

/** Same-color suit pairing for left bower (hearts↔diamonds, spades↔clubs). */
const SAME_COLOR: Record<Suit, Suit> = {
  hearts: 'diamonds',
  diamonds: 'hearts',
  spades: 'clubs',
  clubs: 'spades',
}

export function leftBowerSuit(trump: Suit): Suit {
  return SAME_COLOR[trump]
}

export function isRightBower(card: Card, trump: Suit): boolean {
  return card.suit === trump && card.rank === 'J'
}

export function isLeftBower(card: Card, trump: Suit): boolean {
  return card.suit === leftBowerSuit(trump) && card.rank === 'J'
}

/** Effective suit for follow-suit and trick comparison. */
export function effectiveSuit(card: Card, trump: Suit): Suit {
  if (isRightBower(card, trump) || isLeftBower(card, trump)) return trump
  return card.suit
}

const TRUMP_ORDER = ['9', '10', 'Q', 'K', 'A'] as const

/** Higher = stronger. Right bower tops all; left bower next. */
export function cardPower(card: Card, trump: Suit): number {
  if (isRightBower(card, trump)) return 100
  if (isLeftBower(card, trump)) return 99
  const eff = effectiveSuit(card, trump)
  if (eff === trump) {
    const idx = TRUMP_ORDER.indexOf(card.rank as (typeof TRUMP_ORDER)[number])
    return 50 + (idx >= 0 ? idx : 0)
  }
  const offOrder = ['9', '10', 'J', 'Q', 'K', 'A'] as const
  const idx = offOrder.indexOf(card.rank as (typeof offOrder)[number])
  return idx >= 0 ? idx : 0
}

export function trickWinner(plays: TrickPlay[], trump: Suit): Seat {
  if (plays.length === 0) throw new Error('empty trick')
  const leadSuit = effectiveSuit(plays[0].card, trump)
  let best = plays[0]
  let bestPower = cardPower(best.card, trump)
  let bestTrump = effectiveSuit(best.card, trump) === trump

  for (const p of plays.slice(1)) {
    const eff = effectiveSuit(p.card, trump)
    const power = cardPower(p.card, trump)
    const isTrump = eff === trump

    if (isTrump && !bestTrump) {
      best = p
      bestPower = power
      bestTrump = true
      continue
    }
    if (!isTrump && bestTrump) continue
    if (isTrump && bestTrump) {
      if (power > bestPower) {
        best = p
        bestPower = power
      }
      continue
    }
    if (eff === leadSuit && effectiveSuit(best.card, trump) === leadSuit && power > bestPower) {
      best = p
      bestPower = power
    }
  }
  return best.seat
}

const FARMERS_RANKS = new Set(['9', '10'])

/** Loose farmers hand: only 9s and 10s. Strict: any face card or ace blocks passing. */
export function isFarmersHand(hand: Card[], loose: boolean): boolean {
  if (loose) return hand.every((c) => FARMERS_RANKS.has(c.rank))
  return hand.every((c) => !['9', '10', 'J', 'Q', 'K', 'A'].includes(c.rank))
}

/** Only the farmers-hand house rule: partner with all 9s/10s must order in round 1. */
export function dealersPartnerMustOrder(hand: Card[], rules: { farmersHand: boolean }): boolean {
  if (!rules.farmersHand) return false
  return isFarmersHand(hand, true)
}

export function legalMoves(hand: Card[], trick: TrickPlay[], trump: Suit): Card[] {
  if (hand.length === 0) return []
  if (trick.length === 0) return [...hand]
  const leadSuit = effectiveSuit(trick[0].card, trump)
  const follow = hand.filter((c) => effectiveSuit(c, trump) === leadSuit)
  return follow.length > 0 ? follow : [...hand]
}
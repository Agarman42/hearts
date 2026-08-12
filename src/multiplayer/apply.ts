import type { Seat } from '../core/types'
import {
  acceptReceivedForSeat,
  confirmPassForSeat,
  togglePassCardForSeat,
  tryPlayCard as tryPlayHearts,
} from '../games/hearts/engine'
import {
  submitBid,
  tryPlayCard as tryPlaySpades,
} from '../games/spades/engine'
import {
  discardCard,
  goAlone,
  nameTrump,
  orderUp,
  passBid,
  tryPlayCard as tryPlayEuchre,
  withPartner,
} from '../games/euchre/engine'
import type { ApplyResult, ErrorCode, GameAction, GameBundle } from './protocol'

function fail(code: ErrorCode, message: string): ApplyResult {
  return { ok: false, code, message }
}

export function applyGameAction(
  bundle: GameBundle,
  action: GameAction,
  seat: Seat,
): ApplyResult {
  if (bundle.gameId === 'spades') {
    const s = bundle.state
    if (action.type === 'submit_bid') {
      if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
      const next = submitBid(s, seat, action.bid, action.nil, action.blindNil)
      if (next.bids[seat] == null && s.bids[seat] == null) {
        return fail('illegal', next.warning ?? 'Illegal bid.')
      }
      return { ok: true, bundle: { gameId: 'spades', state: next } }
    }
    if (action.type === 'play_card') {
      if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
      const card = s.players[seat].hand.find((c) => c.id === action.cardId)
      if (!card) return fail('illegal', 'Card not in hand.')
      const next = tryPlaySpades(s, seat, card)
      if (next.currentTrick.length === s.currentTrick.length && next.whoseTurn === s.whoseTurn) {
        return fail('illegal', next.warning ?? 'Illegal play.')
      }
      return { ok: true, bundle: { gameId: 'spades', state: next } }
    }
    return fail('unknown_action', 'Not a Spades action.')
  }

  if (bundle.gameId === 'hearts') {
    const s = bundle.state
    if (action.type === 'toggle_pass_card') {
      const card =
        s.players[seat].hand.find((c) => c.id === action.cardId) ??
        s.players[seat].selectedPass.find((c) => c.id === action.cardId)
      if (!card) return fail('illegal', 'Card not in hand.')
      const before = s.players[seat].selectedPass.map((c) => c.id).join(',')
      const next = togglePassCardForSeat(s, seat, card)
      const after = next.players[seat].selectedPass.map((c) => c.id).join(',')
      if (before === after) {
        return fail('illegal', next.warning ?? 'Illegal pass selection.')
      }
      return { ok: true, bundle: { gameId: 'hearts', state: next } }
    }
    if (action.type === 'confirm_pass') {
      const need = s.rules.passCount
      const wasConfirmed = (s.passSelections[seat]?.length ?? 0) === need
      const next = confirmPassForSeat(s, seat)
      const nowConfirmed = (next.passSelections[seat]?.length ?? 0) === need
      const finalized = s.phase === 'passing' && next.phase !== 'passing'
      if (wasConfirmed || (!nowConfirmed && !finalized)) {
        return fail('illegal', next.warning ?? 'Cannot confirm pass.')
      }
      return { ok: true, bundle: { gameId: 'hearts', state: next } }
    }
    if (action.type === 'accept_received') {
      const next = acceptReceivedForSeat(s, seat)
      if (
        next.phase === s.phase &&
        next.players[seat].hand.length === s.players[seat].hand.length
      ) {
        return fail('illegal', next.warning ?? 'Cannot accept received cards.')
      }
      return { ok: true, bundle: { gameId: 'hearts', state: next } }
    }
    if (action.type === 'play_card') {
      if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
      const card = s.players[seat].hand.find((c) => c.id === action.cardId)
      if (!card) return fail('illegal', 'Card not in hand.')
      const next = tryPlayHearts(s, seat, card)
      if (
        next.currentTrick.length === s.currentTrick.length &&
        next.whoseTurn === s.whoseTurn &&
        next.players[seat].hand.length === s.players[seat].hand.length
      ) {
        return fail('illegal', next.warning ?? 'Illegal play.')
      }
      return { ok: true, bundle: { gameId: 'hearts', state: next } }
    }
    return fail('unknown_action', 'Not a Hearts action.')
  }

  // euchre
  const s = bundle.state
  if (action.type === 'pass_bid') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const next = passBid(s, seat)
    if (next.whoseTurn === s.whoseTurn && next.passedThisRound.length === s.passedThisRound.length) {
      return fail('illegal', next.warning ?? 'Illegal pass.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  if (action.type === 'order_up') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const next = orderUp(s, seat)
    if (next.phase === s.phase && next.whoseTurn === s.whoseTurn && next.trump === s.trump) {
      return fail('illegal', next.warning ?? 'Illegal order up.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  if (action.type === 'name_trump') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const next = nameTrump(s, seat, action.suit)
    if (next.trump === s.trump && next.phase === s.phase && next.whoseTurn === s.whoseTurn) {
      return fail('illegal', next.warning ?? 'Illegal trump call.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  if (action.type === 'discard') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const card = s.players[seat].hand.find((c) => c.id === action.cardId)
    if (!card) return fail('illegal', 'Card not in hand.')
    const next = discardCard(s, seat, card)
    if (next.players[seat].hand.length === s.players[seat].hand.length) {
      return fail('illegal', next.warning ?? 'Illegal discard.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  if (action.type === 'go_alone') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const next = goAlone(s, seat)
    if (next.phase === s.phase && next.loner === s.loner && next.whoseTurn === s.whoseTurn) {
      return fail('illegal', next.warning ?? 'Illegal loner choice.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  if (action.type === 'with_partner') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const next = withPartner(s, seat)
    if (next.phase === s.phase && next.loner === s.loner && next.whoseTurn === s.whoseTurn) {
      return fail('illegal', next.warning ?? 'Illegal partner choice.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  if (action.type === 'play_card') {
    if (s.whoseTurn !== seat) return fail('not_your_turn', 'Not your turn.')
    const card = s.players[seat].hand.find((c) => c.id === action.cardId)
    if (!card) return fail('illegal', 'Card not in hand.')
    const next = tryPlayEuchre(s, seat, card)
    if (
      next.currentTrick.length === s.currentTrick.length &&
      next.whoseTurn === s.whoseTurn &&
      next.players[seat].hand.length === s.players[seat].hand.length
    ) {
      return fail('illegal', next.warning ?? 'Illegal play.')
    }
    return { ok: true, bundle: { gameId: 'euchre', state: next } }
  }
  return fail('unknown_action', 'Not a Euchre action.')
}

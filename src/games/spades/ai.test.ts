import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import { chooseBid, choosePlay } from './ai'
import { DEFAULT_SPADES_RULES } from './types'

const fixedRng = () => 0.1

const basePlayCtx = {
  bids: {
    0: { bid: 4, nil: false },
    1: { bid: 3, nil: false },
    2: { bid: 4, nil: false },
    3: { bid: 3, nil: false },
  },
  tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
  teamBags: { ns: 0, ew: 0 },
  rules: DEFAULT_SPADES_RULES,
} as const

describe('choosePlay partner awareness', () => {
  it('sloughs off-suit when partner is winning instead of trumping', () => {
    const hand = [
      makeCard('spades', 'A'),
      makeCard('hearts', '3'),
      makeCard('diamonds', '4'),
    ]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'K') },
      { seat: 1 as const, card: makeCard('clubs', 'A') },
      { seat: 2 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 3, {
      ...basePlayCtx,
      seat: 3,
    })
    expect(card.suit).not.toBe('spades')
    expect(card.id).toBe('3♥')
  })

  it('does not trump partner winner when void in lead suit', () => {
    const hand = [makeCard('spades', '2'), makeCard('hearts', '5')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'K') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('5♥')
  })

  it('does not overtake partner ace with king when following suit', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'K') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('4♣')
  })

  it('does not steal partner 10 with Ace when last to play', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '10') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('4♣')
  })

  it('third hand takes over partner hanging 9 so last seat cannot steal it', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('A♣')
  })

  it('does not overtake partner when following suit', () => {
    const hand = [makeCard('clubs', 'K'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('4♣')
  })

  it('wins with minimum trump when opponent is winning and team needs tricks', () => {
    const hand = [
      makeCard('spades', 'K'),
      makeCard('spades', '5'),
      makeCard('hearts', '2'),
    ]
    const trick = [{ seat: 1 as const, card: makeCard('diamonds', 'A') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 2, 2: 0, 3: 1 },
    })
    expect(card.id).toBe('5♠')
  })

  it('ducks overtricks when both sides have made their bids', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      // NS bid 8 made; EW bid 6 made — pure bag duck
      tricksWon: { 0: 4, 1: 3, 2: 4, 3: 3 },
    })
    expect(card.id).toBe('3♣')
  })

  it('ducks mid-trick after making bid when taking would not set this book', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      // NS at 8/8; EW 3 of 6 — not last seat and not a one-book set
      tricksWon: { 0: 4, 1: 1, 2: 4, 3: 2 },
    })
    expect(card.id).toBe('3♣')
  })

  it('leads master ace when needing books and memory knows it is boss', () => {
    const hand = [
      makeCard('clubs', 'A'),
      makeCard('clubs', '3'),
      makeCard('hearts', '2'),
      makeCard('diamonds', '4'),
    ]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 0, {
      ...basePlayCtx,
      seat: 0,
      playedIds: new Set(), // A♣ is master
      completedTricks: [],
    })
    expect(card.id).toBe('A♣')
  })

  it('second hand takes with king when team still needs books', () => {
    // Opponent led 10♣; hard must cash K♣ (not duck under old Ace-only SHL)
    const hand = [makeCard('clubs', 'K'), makeCard('clubs', '3'), makeCard('hearts', '2')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(card.id).toBe('K♣')
  })

  it('banks a winner under partner soft lead when still needing books', () => {
    // Partner led 9♣ (soft); hard second with A♣ should secure the book
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4'), makeCard('hearts', '2')]
    const trick = [{ seat: 0 as const, card: makeCard('clubs', '9') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(card.id).toBe('A♣')
  })

  it('leads high when partner bid nil instead of a deuce', () => {
    const hand = [
      makeCard('clubs', '2'),
      makeCard('clubs', 'A'),
      makeCard('hearts', '5'),
    ]
    const card = choosePlay(hand, [], false, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♣')
  })

  it('overtakes nil partner who is winning so they do not take the book', () => {
    // Partner (seat 0) is on nil and currently winning with 10♣ — cover with A♣
    const hand = [makeCard('clubs', 'A'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '10') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♣')
  })

  it('trumps to overtake nil partner when void in lead suit', () => {
    const hand = [makeCard('spades', '5'), makeCard('hearts', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('5♠')
  })

  it('nil bidder plays safe cards that do not win', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '2')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '9') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 0, {
      ...basePlayCtx,
      seat: 0,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('2♣')
  })

  it('leads an honor to cover nil instead of a long middling suit', () => {
    const hand = [
      makeCard('clubs', '7'),
      makeCard('clubs', '8'),
      makeCard('clubs', '9'),
      makeCard('clubs', '10'),
      makeCard('clubs', 'J'),
      makeCard('hearts', 'K'),
      makeCard('diamonds', '4'),
    ]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('K♥')
  })

  it('covers nil with Ace after the team has already made its bid', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '2'), makeCard('hearts', '5')]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true }, 2: { bid: 4, nil: false } },
      tricksWon: { 0: 0, 1: 3, 2: 4, 3: 3 },
    })
    expect(card.id).toBe('A♣')
  })

  it('plays Ace second hand so a last-seat nil partner can duck', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '9') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♣')
  })

  it('covers with Ace, not a cheap winner, when nil partner has not played', () => {
    // 5♣ beats the 3♣ lead, but last seat can top it and force nil (K-Q only) to take
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '5')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '3') }]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♣')
  })

  it('ruffs high to cover a nil partner who still has to play', () => {
    const hand = [makeCard('spades', 'A'), makeCard('spades', '5'), makeCard('hearts', '2')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', 'K') }]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♠')
  })

  it('leads Queen to cover nil instead of a long junk suit', () => {
    const hand = [
      makeCard('clubs', '4'),
      makeCard('clubs', '5'),
      makeCard('clubs', '6'),
      makeCard('clubs', '7'),
      makeCard('clubs', '8'),
      makeCard('clubs', '9'),
      makeCard('clubs', '10'),
      makeCard('hearts', 'Q'),
      makeCard('diamonds', '3'),
    ]
    const card = choosePlay(hand, [], false, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('Q♥')
  })

  it('leads Jack to cover nil instead of a long weak suit', () => {
    const hand = [
      makeCard('clubs', '4'),
      makeCard('clubs', '5'),
      makeCard('clubs', '6'),
      makeCard('clubs', '7'),
      makeCard('clubs', '8'),
      makeCard('hearts', 'J'),
      makeCard('diamonds', '3'),
    ]
    const card = choosePlay(hand, [], false, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('J♥')
  })

  it('leads ace for nil cover over low card from long weak suit', () => {
    const hand = [
      makeCard('clubs', '7'),
      makeCard('clubs', '8'),
      makeCard('clubs', '9'),
      makeCard('hearts', 'A'),
    ]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true } },
    })
    expect(card.id).toBe('A♥')
  })

  it('lets an opponent nil take the book instead of covering them', () => {
    // Seat 0 (You) is on nil and winning with 10♣. Seat 1 must duck A♣.
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '10') },
      { seat: 3 as const, card: makeCard('clubs', '4') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 1, {
      ...basePlayCtx,
      seat: 1,
      bids: {
        0: { bid: 0, nil: true },
        1: { bid: 4, nil: false },
        2: { bid: 4, nil: false },
        3: { bid: 3, nil: false },
      },
    })
    expect(card.id).toBe('3♣')
  })

  it('last seat stays under an opponent nil card when possible', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('hearts', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('hearts', '9') },
      { seat: 1 as const, card: makeCard('hearts', '3') },
      { seat: 2 as const, card: makeCard('hearts', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 3, {
      ...basePlayCtx,
      seat: 3,
      bids: {
        0: { bid: 0, nil: true },
        1: { bid: 4, nil: false },
        2: { bid: 4, nil: false },
        3: { bid: 3, nil: false },
      },
    })
    expect(card.id).toBe('4♥')
  })

  it('leads low to squeeze an opponent nil instead of cashing an ace', () => {
    const hand = [
      makeCard('clubs', '2'),
      makeCard('clubs', 'A'),
      makeCard('hearts', '5'),
    ]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 1, {
      ...basePlayCtx,
      seat: 1,
      bids: {
        0: { bid: 0, nil: true },
        1: { bid: 4, nil: false },
        2: { bid: 4, nil: false },
        3: { bid: 3, nil: false },
      },
    })
    expect(card.id).not.toBe('A♣')
    expect(card.id).toBe('2♣')
  })

  it('cashes a King when the team still needs books instead of leading a deuce', () => {
    const hand = [
      makeCard('clubs', 'K'),
      makeCard('clubs', '7'),
      makeCard('hearts', '2'),
      makeCard('diamonds', '3'),
    ]
    const card = choosePlay(hand, [], false, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(card.id).toBe('K♣')
  })

  it('ruffs high third hand when the team still needs the book', () => {
    const hand = [
      makeCard('spades', 'A'),
      makeCard('spades', '5'),
      makeCard('hearts', '2'),
    ]
    const trick = [
      { seat: 0 as const, card: makeCard('diamonds', '9') },
      { seat: 1 as const, card: makeCard('diamonds', 'A') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 2, 2: 0, 3: 1 },
    })
    expect(card.id).toBe('A♠')
  })

  it('still takes needed tricks at critical bag count while under contract', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      teamBags: { ns: 9, ew: 0 },
      tricksWon: { 0: 3, 1: 1, 2: 3, 3: 2 },
    })
    expect(card.id).toBe('A♣')
  })

  it('ducks overtricks at critical bag count when contract is already made', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', '10') }]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      teamBags: { ns: 9, ew: 0 },
      tricksWon: { 0: 4, 1: 1, 2: 4, 3: 2 },
    })
    expect(card.id).toBe('3♣')
  })
})

describe('invariants', () => {
  it('last seat does not overtake partner Ace when team still needs books', () => {
    const hand = [makeCard('clubs', 'K'), makeCard('clubs', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(card.id).toBe('4♣')
  })

  it('easy last seat does not overtake partner Ace', () => {
    const hand = [makeCard('clubs', 'K'), makeCard('clubs', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'easy', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('4♣')
  })

  it('void player sloughs off-suit instead of ruffing partner’s winner', () => {
    const hand = [makeCard('spades', 'A'), makeCard('hearts', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '4') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('3♥')
  })

  it('third hand overtakes partner’s 9 when last seat is an opponent and contract is live', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
    })
    expect(card.id).toBe('A♣')
  })

  it('last seat always banks a needed book if a winner exists', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [
      { seat: 1 as const, card: makeCard('clubs', '10') },
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'easy', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(card.id).toBe('A♣')
  })

  it('does not cover partner nil after partner already took a book', () => {
    // Nil is already set; team has made the numbered bid — resume bags, do not cash A.
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '2'), makeCard('hearts', '5')]
    const card = choosePlay(hand, [], false, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: { ...basePlayCtx.bids, 0: { bid: 0, nil: true }, 2: { bid: 4, nil: false } },
      tricksWon: { 0: 1, 1: 3, 2: 4, 3: 3 },
    })
    expect(card.id).not.toBe('A♣')
  })

  it('does not overtake opponent’s clean nil card', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '10') },
      { seat: 3 as const, card: makeCard('clubs', '4') },
    ]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 1, {
      ...basePlayCtx,
      seat: 1,
      bids: {
        0: { bid: 0, nil: true },
        1: { bid: 4, nil: false },
        2: { bid: 4, nil: false },
        3: { bid: 3, nil: false },
      },
    })
    expect(card.id).toBe('3♣')
  })

  it('does not lead baby spades while still under contract unless desperate', () => {
    const hand = [
      makeCard('spades', '2'),
      makeCard('spades', '3'),
      makeCard('hearts', '4'),
      makeCard('hearts', '5'),
    ]
    const card = choosePlay(hand, [], true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(card.suit).not.toBe('spades')
  })
})

describe('chooseBid', () => {
  it('hard bids nil on a soft low-spade hand with a void', () => {
    // No aces/kings, ≤2 low spades, void in clubs, low estimate
    const nilHand = [
      makeCard('spades', '2'),
      makeCard('spades', '3'),
      makeCard('hearts', '3'),
      makeCard('hearts', '4'),
      makeCard('hearts', '5'),
      makeCard('hearts', '6'),
      makeCard('diamonds', '3'),
      makeCard('diamonds', '4'),
      makeCard('diamonds', '5'),
      makeCard('diamonds', '6'),
      makeCard('diamonds', '7'),
      makeCard('diamonds', '8'),
      makeCard('hearts', '7'),
    ]
    const pick = chooseBid(nilHand, 'hard', () => 0.5, {
      seat: 0,
      bids: {},
      rules: DEFAULT_SPADES_RULES,
    })
    expect(pick.nil).toBe(true)
    expect(pick.bid).toBe(0)
  })

  it('hard bids nil on a low 4-suit hand with no void', () => {
    // Common "safe" nil: two baby spades, no aces/kings, no void.
    // Old shape required a void and almost never fired at the table.
    const nilHand = [
      makeCard('spades', '2'),
      makeCard('spades', '4'),
      makeCard('hearts', '3'),
      makeCard('hearts', '4'),
      makeCard('hearts', '5'),
      makeCard('hearts', '6'),
      makeCard('diamonds', '3'),
      makeCard('diamonds', '4'),
      makeCard('diamonds', '5'),
      makeCard('diamonds', '6'),
      makeCard('clubs', '3'),
      makeCard('clubs', '4'),
      makeCard('clubs', '5'),
    ]
    const pick = chooseBid(nilHand, 'hard', () => 0.5, {
      seat: 0,
      bids: {},
      rules: DEFAULT_SPADES_RULES,
    })
    expect(pick.nil).toBe(true)
    expect(pick.bid).toBe(0)
  })

  it('refuses a 5-bid on A + junk, no boss spade', () => {
    const junk = [
      makeCard('hearts', 'A'),
      makeCard('hearts', '6'),
      makeCard('hearts', '5'),
      makeCard('diamonds', '9'),
      makeCard('diamonds', '8'),
      makeCard('diamonds', '7'),
      makeCard('clubs', '9'),
      makeCard('clubs', '8'),
      makeCard('clubs', '7'),
      makeCard('clubs', '6'),
      makeCard('spades', '8'),
      makeCard('spades', '7'),
      makeCard('spades', '6'),
    ]
    const pick = chooseBid(junk, 'hard', () => 0.5, {
      seat: 0,
      bids: {},
      rules: DEFAULT_SPADES_RULES,
    })
    expect(pick.nil).toBe(false)
    expect(pick.bid).toBeLessThanOrEqual(3)
  })

  it('caps team bid so partner-6 plus our hand cannot reach a 12-suicide', () => {
    const strong = [
      makeCard('spades', 'A'),
      makeCard('spades', 'K'),
      makeCard('spades', 'Q'),
      makeCard('spades', 'J'),
      makeCard('hearts', 'A'),
      makeCard('hearts', 'K'),
      makeCard('diamonds', 'A'),
      makeCard('diamonds', 'K'),
      makeCard('clubs', 'A'),
      makeCard('clubs', 'K'),
      makeCard('clubs', 'Q'),
      makeCard('hearts', 'Q'),
      makeCard('diamonds', 'Q'),
    ]
    const pick = chooseBid(strong, 'hard', () => 0.5, {
      seat: 2,
      bids: { 0: { bid: 6, nil: false } },
      rules: DEFAULT_SPADES_RULES,
    })
    expect(pick.bid + 6).toBeLessThanOrEqual(11)
  })

  it('medium does not bid 5 on a soft one-ace hand', () => {
    const soft = [
      makeCard('spades', '9'),
      makeCard('spades', '8'),
      makeCard('hearts', 'A'),
      makeCard('hearts', '7'),
      makeCard('hearts', '6'),
      makeCard('diamonds', 'K'),
      makeCard('diamonds', '5'),
      makeCard('diamonds', '4'),
      makeCard('clubs', 'Q'),
      makeCard('clubs', 'J'),
      makeCard('clubs', '9'),
      makeCard('clubs', '8'),
      makeCard('clubs', '7'),
    ]
    const pick = chooseBid(soft, 'medium', fixedRng, {
      seat: 0,
      bids: {},
      rules: DEFAULT_SPADES_RULES,
    })
    expect(pick.nil).toBe(false)
    expect(pick.bid).toBeLessThanOrEqual(3)
  })

  it('bids higher when partner declared nil', () => {
    const weakHand = [
      makeCard('hearts', '9'),
      makeCard('diamonds', '9'),
      makeCard('clubs', '10'),
      makeCard('hearts', '10'),
      makeCard('diamonds', '10'),
      makeCard('clubs', '9'),
      makeCard('hearts', 'J'),
      makeCard('diamonds', 'J'),
      makeCard('clubs', 'J'),
      makeCard('hearts', 'Q'),
      makeCard('diamonds', 'Q'),
      makeCard('clubs', 'Q'),
      makeCard('hearts', 'K'),
    ]
    const solo = chooseBid(weakHand, 'medium', fixedRng)
    const covering = chooseBid(weakHand, 'medium', fixedRng, {
      seat: 1,
      bids: { 3: { bid: 0, nil: true, blindNil: false } },
    })
    expect(covering.bid).toBeGreaterThanOrEqual(solo.bid)
  })
})

describe('team bags after the contract is made', () => {
  const nsBid7 = {
    ...basePlayCtx,
    bids: {
      0: { bid: 5, nil: false },
      1: { bid: 3, nil: false },
      2: { bid: 2, nil: false },
      3: { bid: 3, nil: false },
    },
  }

  it('sloughs when the team is already at bid and partner is winning with Ace', () => {
    const hand = [makeCard('spades', 'A'), makeCard('hearts', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...nsBid7,
      seat: 2,
      tricksWon: { 0: 5, 1: 2, 2: 2, 3: 2 },
    })
    expect(card.id).toBe('3♥')
    expect(card.suit).not.toBe('spades')
  })

  it('last seat ducks an overtrick after the team made 6 — not a set-or-bust', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [
      { seat: 1 as const, card: makeCard('clubs', 'K') },
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: {
        0: { bid: 3, nil: false },
        1: { bid: 4, nil: false },
        2: { bid: 3, nil: false },
        3: { bid: 3, nil: false },
      },
      tricksWon: { 0: 3, 1: 2, 2: 3, 3: 2 },
    })
    expect(card.id).toBe('3♣')
  })

  it('ducks last-seat overtrick at bag caution even if opponents still need books', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [
      { seat: 1 as const, card: makeCard('clubs', 'K') },
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: {
        0: { bid: 3, nil: false },
        1: { bid: 3, nil: false },
        2: { bid: 3, nil: false },
        3: { bid: 3, nil: false },
      },
      teamBags: { ns: 8, ew: 0 },
      tricksWon: { 0: 3, 1: 2, 2: 3, 3: 2 },
    })
    expect(card.id).toBe('3♣')
  })

  it('may take last seat to set when bags are none and opponents need exactly one', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '3')]
    const trick = [
      { seat: 1 as const, card: makeCard('clubs', 'K') },
      { seat: 0 as const, card: makeCard('clubs', '4') },
      { seat: 3 as const, card: makeCard('clubs', '5') },
    ]
    const card = choosePlay(hand, trick, true, 'hard', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: {
        0: { bid: 3, nil: false },
        1: { bid: 3, nil: false },
        2: { bid: 3, nil: false },
        3: { bid: 3, nil: false },
      },
      teamBags: { ns: 2, ew: 0 },
      tricksWon: { 0: 3, 1: 3, 2: 3, 3: 2 },
    })
    expect(card.id).toBe('A♣')
  })

  it('does not ruff or overtake partner who is already winning an extra book', () => {
    const hand = [makeCard('spades', 'K'), makeCard('diamonds', '2')]
    const trick = [
      { seat: 0 as const, card: makeCard('hearts', 'A') },
      { seat: 1 as const, card: makeCard('hearts', '9') },
    ]
    const card = choosePlay(hand, trick, true, 'medium', fixedRng, 2, {
      ...basePlayCtx,
      seat: 2,
      bids: {
        0: { bid: 3, nil: false },
        1: { bid: 4, nil: false },
        2: { bid: 3, nil: false },
        3: { bid: 3, nil: false },
      },
      tricksWon: { 0: 4, 1: 2, 2: 2, 3: 2 },
    })
    expect(card.id).toBe('2♦')
  })
})
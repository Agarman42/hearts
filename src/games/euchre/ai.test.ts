import { describe, expect, it } from 'vitest'
import { makeCard } from '../../core/cards'
import {
  chooseDiscard,
  chooseGoAlone,
  chooseOrderUp,
  choosePlay,
  chooseTrumpSuit,
  outsideTrumpRemaining,
} from './ai'

const alwaysPass = () => 1
const neverPass = () => 0

describe('euchre AI', () => {
  it('orders up with strong trump', () => {
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('hearts', 'K'),
      makeCard('clubs', '9'),
    ]
    expect(chooseOrderUp(hand, 'hearts', 'hard', neverPass, undefined, 0, 0)).toBe(true)
  })

  it('passes ordering when hand is weak and opponent is dealer', () => {
    const hand = [
      makeCard('clubs', '9'),
      makeCard('spades', '10'),
      makeCard('diamonds', '9'),
      makeCard('hearts', '9'),
      makeCard('clubs', '10'),
    ]
    expect(
      chooseOrderUp(hand, 'hearts', 'medium', neverPass, makeCard('hearts', '9'), 1, 0),
    ).toBe(false)
  })

  it('passes round-2 trump with only one low trump', () => {
    const hand = [
      makeCard('diamonds', '9'),
      makeCard('clubs', '9'),
      makeCard('spades', '10'),
      makeCard('clubs', '10'),
      makeCard('hearts', '9'),
    ]
    expect(chooseTrumpSuit(hand, 'hearts', 'medium', alwaysPass)).toBeNull()
  })

  it('chooses trump suit in round 2', () => {
    const hand = [
      makeCard('diamonds', 'J'),
      makeCard('diamonds', '9'),
      makeCard('diamonds', '10'),
      makeCard('diamonds', 'K'),
      makeCard('clubs', '9'),
    ]
    expect(chooseTrumpSuit(hand, 'hearts', 'hard', neverPass)).toBe('diamonds')
  })

  it('goes alone with bowers and trump depth', () => {
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('diamonds', 'J'),
      makeCard('hearts', 'A'),
      makeCard('hearts', 'K'),
      makeCard('clubs', '9'),
    ]
    expect(chooseGoAlone(hand, 'hearts', 'hard', () => 0)).toBe(true)
  })

  it('stays with partner when team is within two points of winning', () => {
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('diamonds', 'J'),
      makeCard('hearts', 'A'),
      makeCard('hearts', 'K'),
      makeCard('clubs', '9'),
    ]
    expect(
      chooseGoAlone(hand, 'hearts', 'hard', () => 0, {
        makerTeam: 'ns',
        teamScores: { ns: 8, ew: 3 },
        raceTo: 10,
      }),
    ).toBe(false)
  })

  it('plays legal card from hand', () => {
    const card = makeCard('hearts', '9')
    const played = choosePlay([card], [], 'hearts', 'medium', () => 0, 0)
    expect(played.id).toBe(card.id)
  })

  it('prefers next-suit call when upcard is turned down', () => {
    const hand = [
      makeCard('diamonds', 'J'),
      makeCard('diamonds', '9'),
      makeCard('diamonds', '10'),
      makeCard('diamonds', 'K'),
      makeCard('clubs', '9'),
    ]
    expect(chooseTrumpSuit(hand, 'hearts', 'hard', neverPass)).toBe('diamonds')
  })

  it('maker leads low trump to pull on a medium-strength hand', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
    })
    expect(played.suit).toBe('hearts')
    expect(played.rank).toBe('9')
  })

  it('strong maker leads right bower to pull trump', () => {
    const hand = [
      makeCard('hearts', 'J'), // right
      makeCard('hearts', 'A'),
      makeCard('hearts', '9'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      loner: false,
    })
    expect(played.id).toBe('J♥')
  })

  it('maker with both bowers leads right, not an off-suit ace', () => {
    const hand = [
      makeCard('hearts', 'J'), // right
      makeCard('diamonds', 'J'), // left
      makeCard('clubs', 'A'),
      makeCard('spades', '9'),
      makeCard('diamonds', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
      playedIds: new Set(),
    })
    expect(played.id).toBe('J♥')
  })

  it('maker leads left bower before off ace after right is already out', () => {
    // Right already played; still hold left + club ace — must pull left first
    const hand = [
      makeCard('diamonds', 'J'), // left
      makeCard('clubs', 'A'),
      makeCard('spades', '9'),
      makeCard('spades', '10'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
      playedIds: new Set(['J♥', '9♥', '10♣', '9♣']),
    })
    expect(played.id).toBe('J♦')
  })

  it('loner leads right bower to pull trump', () => {
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('hearts', 'K'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      loner: true,
    })
    expect(played.id).toBe('J♥')
  })

  it('defender leads trump to pull when holding multiple trump', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 1, {
      seat: 1,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.suit).toBe('hearts')
    expect(played.rank).toBe('9')
  })

  it('ruffs high third hand so last seat cannot over-ruff a baby trump', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('hearts', '9')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', 'A') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 1, 2: 0, 3: 1 },
    })
    expect(played.id).toBe('A♥')
  })

  it('maker team wins with cheap trump when behind on tricks', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('diamonds', '9')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', 'A') }]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 1, 2: 0, 3: 0 },
    })
    expect(played.suit).toBe('hearts')
  })

  it('sloughs low when void and partner is winning', () => {
    const hand = [makeCard('diamonds', '9'), makeCard('diamonds', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '10') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
    })
    expect(played.id).toBe('3♦')
  })

  it('voids shortest off-trump suit when discarding', () => {
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('hearts', 'A'),
      makeCard('hearts', 'K'),
      makeCard('hearts', '9'),
      makeCard('clubs', '9'),
      makeCard('clubs', '10'),
    ]
    const discarded = chooseDiscard(hand, 'hearts')
    expect(discarded.suit).toBe('clubs')
    expect(discarded.rank).toBe('10')
  })

  it('never discards the locked kitty pickup', () => {
    const pickup = makeCard('clubs', '9')
    const hand = [
      makeCard('hearts', 'J'),
      makeCard('hearts', 'A'),
      makeCard('hearts', 'K'),
      makeCard('hearts', '9'),
      makeCard('diamonds', '10'),
      pickup,
    ]
    const discarded = chooseDiscard(hand, 'hearts', pickup.id)
    expect(discarded.id).not.toBe(pickup.id)
  })

  it('loner maker keeps winning after 3 tricks for march', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('diamonds', '9')]
    const trick = [{ seat: 1 as const, card: makeCard('clubs', 'A') }]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      loner: true,
      tricksWon: { 0: 3, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.suit).toBe('hearts')
  })

  it('sloughs off-suit when already winning the trick', () => {
    const hand = [makeCard('hearts', '9'), makeCard('diamonds', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', 'A') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 1, {
      seat: 1,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
    })
    expect(played.id).toBe('3♦')
  })

  it('third hand overtakes partner hanging 9 so last seat cannot steal it', () => {
    // Partner led 9♣, RHO ducked. Dumping 4♣ leaves last seat a free book.
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('A♣')
  })

  it('does not overtake partner hanging 9 when last to play', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
      { seat: 3 as const, card: makeCard('clubs', '2') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('4♣')
  })

  it('maker partner leads trump back instead of an off-suit ace', () => {
    const hand = [
      makeCard('hearts', '10'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
      playedIds: new Set(['9♣', '10♣', 'Q♣', 'K♣']),
    })
    expect(played.suit).toBe('hearts')
  })

  it('does not over-trump partner when last to play', () => {
    const hand = [makeCard('hearts', '9'), makeCard('diamonds', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '10') },
      { seat: 3 as const, card: makeCard('clubs', '2') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('3♦')
  })

  it('maker partner takes when opponents are winning and team still needs books', () => {
    // Partner (maker seat 0) led low; RHO beat it — partner AI (seat 2) must take
    const hand = [makeCard('hearts', 'A'), makeCard('diamonds', '9')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', 'A') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'medium', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 1, 2: 0, 3: 1 },
    })
    expect(played.id).toBe('A♥')
  })

  it('defenders keep fighting for euchre after already taking one trick', () => {
    // Old bug: stopped after 1 defender trick. Need 3 to euchre.
    const hand = [makeCard('hearts', 'K'), makeCard('diamonds', '9')]
    const trick = [{ seat: 0 as const, card: makeCard('clubs', 'A') }]
    const played = choosePlay(hand, trick, 'hearts', 'medium', () => 0, 1, {
      seat: 1,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 1, 1: 1, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('K♥')
  })

  it('avoids leading ace of a suit an opponent is known void in', () => {
    const hand = [
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
      makeCard('spades', '10'),
      makeCard('diamonds', '10'),
    ]
    // Seat 1 previously failed to follow clubs
    const completedTricks = [
      {
        plays: [
          { seat: 0 as const, card: makeCard('clubs', '9') },
          { seat: 1 as const, card: makeCard('hearts', '9') },
          { seat: 2 as const, card: makeCard('clubs', '10') },
          { seat: 3 as const, card: makeCard('clubs', 'Q') },
        ],
      },
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      completedTricks,
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.id).not.toBe('A♣')
  })

  it('last seat does not overtrump partner’s right bower', () => {
    // Partner already winning with left bower; right would steal the book.
    const hand = [makeCard('hearts', 'J'), makeCard('diamonds', '9')]
    const trick = [
      { seat: 1 as const, card: makeCard('clubs', '9') },
      { seat: 0 as const, card: makeCard('diamonds', 'J') },
      { seat: 3 as const, card: makeCard('clubs', '10') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'hard', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('9♦')
  })

  it('easy last seat does not overtrump partner’s off-ace', () => {
    const hand = [makeCard('hearts', '9'), makeCard('diamonds', '3')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', 'A') },
      { seat: 1 as const, card: makeCard('clubs', '10') },
      { seat: 3 as const, card: makeCard('clubs', '9') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'easy', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 1, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('3♦')
  })

  it('third hand takes partner’s hanging 9 when point is live', () => {
    const hand = [makeCard('clubs', 'A'), makeCard('clubs', '4')]
    const trick = [
      { seat: 0 as const, card: makeCard('clubs', '9') },
      { seat: 1 as const, card: makeCard('clubs', '3') },
    ]
    const played = choosePlay(hand, trick, 'hearts', 'medium', () => 0, 2, {
      seat: 2,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    expect(played.id).toBe('A♣')
  })

  it('maker does not lead off-ace while a trump is still out', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('clubs', 'A'),
      makeCard('diamonds', '9'),
      makeCard('spades', '9'),
    ]
    const played = choosePlay(hand, [], 'hearts', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 0, 1: 0, 2: 0, 3: 0 },
      playedIds: new Set(),
    })
    expect(played.id).not.toBe('A♣')
    expect(played.suit).toBe('hearts')
  })

  it('defender still takes the 3rd book to euchre', () => {
    const hand = [makeCard('hearts', 'K'), makeCard('diamonds', '9')]
    const trick = [{ seat: 0 as const, card: makeCard('clubs', 'A') }]
    const played = choosePlay(hand, trick, 'hearts', 'medium', () => 0, 1, {
      seat: 1,
      maker: 0,
      trump: 'hearts',
      makerTeam: 'ns',
      tricksWon: { 0: 2, 1: 1, 2: 0, 3: 1 },
    })
    expect(played.id).toBe('K♥')
  })

  it('passes order-up with two low trump, opponent dealer', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('clubs', '9'),
      makeCard('spades', '10'),
      makeCard('diamonds', '9'),
    ]
    expect(
      chooseOrderUp(hand, 'hearts', 'easy', () => 0, makeCard('hearts', 'Q'), 1, 0),
    ).toBe(false)
  })

  it('does not order thin hand to opponent dealer', () => {
    const hand = [
      makeCard('hearts', '9'),
      makeCard('hearts', '10'),
      makeCard('clubs', '9'),
      makeCard('spades', '10'),
      makeCard('diamonds', '9'),
    ]
    // seat 1 ordering hearts to dealer seat 0 (opponents)
    expect(
      chooseOrderUp(hand, 'hearts', 'hard', () => 0, makeCard('hearts', 'Q'), 1, 0),
    ).toBe(false)
  })
})

describe('loner / maker cash off-ace after trump is drawn', () => {
  const allSpadeTrump = ['J♠', 'J♣', 'A♠', 'K♠', 'Q♠', '10♠', '9♠'] as const

  it('loner leads A♥ not 9♣ after right and left are gone', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('clubs', '9')]
    const played = choosePlay(hand, [], 'spades', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'spades',
      makerTeam: 'ns',
      loner: true,
      sittingOut: 2,
      tricksWon: { 0: 2, 1: 0, 2: 0, 3: 1 },
      playedIds: new Set(allSpadeTrump),
    })
    expect(played.id).toBe('A♥')
  })

  it('loner leads A♥ from A♥ / K♦ / 9♣ once trump is pulled', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('diamonds', 'K'), makeCard('clubs', '9')]
    const played = choosePlay(hand, [], 'spades', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'spades',
      makerTeam: 'ns',
      loner: true,
      sittingOut: 2,
      tricksWon: { 0: 2, 1: 0, 2: 0, 3: 0 },
      playedIds: new Set(allSpadeTrump),
    })
    expect(played.id).toBe('A♥')
  })

  it('loner leads left bower before off-ace while trump remains outside', () => {
    const hand = [makeCard('clubs', 'J'), makeCard('hearts', 'A')]
    const played = choosePlay(hand, [], 'spades', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'spades',
      makerTeam: 'ns',
      loner: true,
      sittingOut: 2,
      tricksWon: { 0: 1, 1: 0, 2: 0, 3: 0 },
      playedIds: new Set(['J♠', '9♠', '10♥', '9♥']),
    })
    expect(played.id).toBe('J♣')
  })

  it('maker with partner leads A♦ not 9♣ after trump is drawn', () => {
    const hand = [makeCard('diamonds', 'A'), makeCard('clubs', '9')]
    const played = choosePlay(hand, [], 'spades', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'spades',
      makerTeam: 'ns',
      loner: false,
      tricksWon: { 0: 2, 1: 1, 2: 1, 3: 0 },
      playedIds: new Set(allSpadeTrump),
    })
    expect(played.id).toBe('A♦')
  })

  it('does not drop the off-ace to avoid a known void after trump is gone', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('clubs', '9')]
    const completed = [
      {
        plays: [
          { seat: 0 as const, card: makeCard('hearts', '9') },
          { seat: 1 as const, card: makeCard('clubs', '10') },
          { seat: 3 as const, card: makeCard('hearts', '10') },
        ],
      },
    ]
    const played = choosePlay(hand, [], 'spades', 'hard', () => 0, 0, {
      seat: 0,
      maker: 0,
      trump: 'spades',
      makerTeam: 'ns',
      loner: true,
      sittingOut: 2,
      tricksWon: { 0: 2, 1: 0, 2: 0, 3: 1 },
      playedIds: new Set(allSpadeTrump),
      completedTricks: completed,
    })
    expect(played.id).toBe('A♥')
  })

  it('outsideTrumpRemaining counts only unplayed trump not in hand', () => {
    const empty = [] as const
    expect(outsideTrumpRemaining([], 'spades', new Set(['J♠', 'J♣']))).toBe(5)
    expect(outsideTrumpRemaining([], 'spades', new Set(allSpadeTrump))).toBe(0)
    expect(
      outsideTrumpRemaining([makeCard('spades', 'A')], 'spades', new Set(['J♠', 'J♣'])),
    ).toBe(4)
    expect(outsideTrumpRemaining([...empty], 'spades', new Set(allSpadeTrump))).toBe(0)
  })
})
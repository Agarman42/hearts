import { describe, expect, it } from 'vitest'
import { makeCard } from '../core/cards'
import { partnerOf } from '../core/partnership'
import {
  dealerMustCallTrump,
  goAlone,
  orderUp,
  passBid,
  startNewGame as startEuchre,
  tryPlayCard as playEuchre,
  createInitialState as newEuchre,
  discardCard,
} from './euchre/engine'
import { legalMoves as euchreLegal } from './euchre/rules'
import { checkMatchWinner, scoreHand as scoreEuchre } from './euchre/scoring'
import { dealHand as dealHearts, createInitialState as newHearts } from './hearts/engine'
import { legalMoves as heartsLegal, applyMoonScoring, trickPoints } from './hearts/rules'
import { heartsPenalty } from './hearts/scoring'
import {
  createInitialState as newSpades,
  dealHand as dealSpades,
  submitBid,
  tryPlayCard as playSpades,
} from './spades/engine'
import { illegalReason } from './spades/rules'
import { applyTeamBagPenalties, scoreHand as scoreSpades } from './spades/scoring'
import {
  EUCHRE_HOUSE_PRESETS,
  HEARTS_HOUSE_PRESETS,
  SPADES_HOUSE_PRESETS,
} from './tablePresets'

const euchrePaths = [
  { tricks: 5, loner: false, maker: 2, defenders: 0, marched: true, euchred: false },
  { tricks: 5, loner: true, maker: 4, defenders: 0, marched: true, euchred: false },
  { tricks: 4, loner: true, maker: 1, defenders: 0, marched: false, euchred: false },
  { tricks: 3, loner: false, maker: 1, defenders: 0, marched: false, euchred: false },
  { tricks: 2, loner: true, maker: 0, defenders: 2, marched: false, euchred: true },
  { tricks: 0, loner: false, maker: 0, defenders: 2, marched: false, euchred: true },
] as const

describe('euchre house scoring', () => {
  for (const preset of EUCHRE_HOUSE_PRESETS) {
    for (const path of euchrePaths) {
      it(`${preset.id} scores ${path.tricks} tricks${path.loner ? ' alone' : ''}`, () => {
        const scored = scoreEuchre('ns', path.tricks, preset.rules, path.loner)
        expect(scored.points.ns).toBe(path.maker)
        expect(scored.points.ew).toBe(path.defenders)
        expect(scored.marched).toBe(path.marched)
        expect(scored.euchred).toBe(path.euchred)
        expect(scored.loner).toBe(path.loner)
      })
    }
  }

  it('race to 5 ends when a team reaches 5', () => {
    const rules = EUCHRE_HOUSE_PRESETS.find((p) => p.id === 'race-5')!.rules
    expect(checkMatchWinner({ ns: 5, ew: 4 }, rules.raceTo)).toBe('ns')
    expect(checkMatchWinner({ ns: 4, ew: 4 }, rules.raceTo)).toBeNull()
  })

  it('casual lets the dealer pass and deals again', () => {
    const casual = EUCHRE_HOUSE_PRESETS.find((p) => p.id === 'casual')!.rules
    let s = startEuchre({ ...newEuchre(), rules: casual })
    expect(s.rules.stickTheDealer).toBe(false)
    let passes = 0
    while (s.handNumber === 1 && s.phase === 'bidding' && passes < 8) {
      s = passBid(s, s.whoseTurn!)
      passes += 1
    }
    expect(passes).toBe(8)
    expect(s.handNumber).toBe(2)
    expect(s.biddingRound).toBe(1)
    expect(s.trump).toBeNull()
    expect(dealerMustCallTrump(s, s.dealer)).toBe(false)
  })

  it('a loner sits the partner out and the trick ends in three cards', () => {
    let s = startEuchre(newEuchre())
    for (let i = 0; i < 12 && s.phase === 'bidding' && s.whoseTurn !== 0; i++) {
      s = passBid(s, s.whoseTurn!)
    }
    if (s.whoseTurn !== 0) s = { ...s, whoseTurn: 0 }
    s = orderUp(s, 0)
    for (let i = 0; i < 8 && s.phase === 'discard'; i++) {
      const seat = s.whoseTurn!
      const hand = s.players[seat].hand
      const discard = hand.find((c) => c.id !== s.pickedUpCard?.id) ?? hand[0]!
      s = discardCard(s, seat, discard)
    }
    expect(s.phase).toBe('loner_choice')
    s = { ...s, teamScores: { ns: 0, ew: 0 } }
    const maker = s.maker!
    s = goAlone(s, maker)
    expect(s.loner).toBe(true)
    expect(s.sittingOut).toBe(partnerOf(maker))
    const played: number[] = []
    for (let i = 0; i < 3; i++) {
      const seat = s.whoseTurn!
      expect(seat).not.toBe(s.sittingOut)
      played.push(seat)
      const card = euchreLegal(s.players[seat].hand, s.currentTrick, s.trump!)[0]!
      s = playEuchre(s, seat, card)
    }
    expect(s.phase).toBe('trick_reveal')
    expect(s.lastTrick?.plays).toHaveLength(3)
    expect(played).not.toContain(partnerOf(maker))
  })
})

describe('spades house scoring', () => {
  const madeNil = {
    0: { bid: 0, nil: true, blindNil: false },
    1: { bid: 3, nil: false },
    2: { bid: 4, nil: false },
    3: { bid: 3, nil: false },
  }
  const tricksMade = { 0: 0, 1: 3, 2: 4, 3: 6 }
  const tricksFailed = { 0: 1, 1: 3, 2: 3, 3: 6 }

  for (const preset of SPADES_HOUSE_PRESETS) {
    it(`${preset.id} pays a made nil and a failed nil`, () => {
      const made = scoreSpades(madeNil, tricksMade, preset.rules)
      const failed = scoreSpades(madeNil, tricksFailed, preset.rules)
      expect(made.nilResults[0]).toEqual({ made: true, points: 100 })
      expect(made.teamPoints.ns).toBe(140)
      expect(failed.nilResults[0]).toEqual({ made: false, points: -100 })
      expect(failed.teamPoints.ns).toBe(-60)
    })

    it(`${preset.id} scores blind nil only when the preset allows it`, () => {
      const bids = {
        ...madeNil,
        0: { bid: 0, nil: true, blindNil: true },
      }
      const scored = scoreSpades(bids, tricksMade, preset.rules)
      const bonus = preset.rules.blindNil ? 200 : 100
      expect(scored.nilResults[0]?.points).toBe(bonus)
    })

    it(`${preset.id} takes 100 at 10 bags only when bags are on`, () => {
      const applied = applyTeamBagPenalties(
        { ns: 200, ew: 100 },
        { ns: 8, ew: 0 },
        { ns: 2, ew: 0 },
        preset.rules,
      )
      if (preset.rules.bagPenalty) {
        expect(applied.teamScores.ns).toBe(100)
        expect(applied.teamBags.ns).toBe(0)
      } else {
        expect(applied.teamScores.ns).toBe(200)
        expect(applied.teamBags.ns).toBe(10)
      }
    })
  }

  it('kitchen rejects a blind nil bid and club accepts it', () => {
    const kitchen = SPADES_HOUSE_PRESETS.find((p) => p.id === 'kitchen')!.rules
    const club = SPADES_HOUSE_PRESETS.find((p) => p.id === 'club')!.rules
    const s = dealSpades(newSpades())
    const seat = s.whoseTurn!
    const blocked = submitBid({ ...s, rules: kitchen }, seat, 0, true, true)
    expect(blocked.warning).toMatch(/Blind nil/)
    expect(blocked.bids[seat]).toBeUndefined()
    const accepted = submitBid({ ...s, rules: club }, seat, 0, true, true)
    expect(accepted.bids[seat]?.blindNil).toBe(true)
    expect(accepted.bids[seat]?.nil).toBe(true)
  })

  it('refuses a renege and a spade lead before spades are broken', () => {
    const dealt = dealSpades(newSpades())
    const heart = makeCard('hearts', '2')
    const club = makeCard('clubs', 'A')
    const spade = makeCard('spades', '4')
    const lead = makeCard('hearts', 'K')
    const following = {
      ...dealt,
      phase: 'playing' as const,
      whoseTurn: 0 as const,
      trickLeader: 1 as const,
      spadesBroken: false,
      currentTrick: [{ seat: 1 as const, card: lead }],
      players: { ...dealt.players, 0: { ...dealt.players[0], hand: [heart, club] } },
    }
    expect(illegalReason(following.players[0].hand, following.currentTrick, club, false)).toMatch(
      /follow suit/,
    )
    const refused = playSpades(following, 0, club)
    expect(refused.warning).toMatch(/follow suit/)
    expect(refused.players[0].hand).toHaveLength(2)
    expect(refused.currentTrick).toHaveLength(1)
    const played = playSpades(following, 0, heart)
    expect(played.warning).toBeNull()
    expect(played.currentTrick).toHaveLength(2)

    const leading = {
      ...dealt,
      phase: 'playing' as const,
      whoseTurn: 0 as const,
      trickLeader: 0 as const,
      spadesBroken: false,
      currentTrick: [],
      players: { ...dealt.players, 0: { ...dealt.players[0], hand: [heart, spade] } },
    }
    const earlySpade = playSpades(leading, 0, spade)
    expect(earlySpade.warning).toMatch(/not broken/)
    expect(earlySpade.spadesBroken).toBe(false)
    const off = playSpades(leading, 0, heart)
    expect(off.spadesBroken).toBe(false)
    expect(off.currentTrick[0]?.card.suit).toBe('hearts')
  })
})

describe('hearts house scoring', () => {
  for (const preset of HEARTS_HOUSE_PRESETS) {
    it(`${preset.id} counts hearts and the queen, and the jack only on Club`, () => {
      const queen = trickPoints(
        [
          { seat: 0, card: makeCard('hearts', 'A') },
          { seat: 1, card: makeCard('spades', 'Q') },
        ],
        preset.rules,
      )
      expect(queen).toBe(14)
      expect(heartsPenalty(makeCard('diamonds', 'J'), preset.rules)).toBe(
        preset.rules.jackOfDiamonds ? -10 : 0,
      )
      const moon = applyMoonScoring({ 0: 26, 1: 0, 2: 0, 3: 0 }, preset.rules)
      expect(moon.moonShooter).toBe(0)
      expect(moon.scores).toEqual({ 0: 0, 1: 26, 2: 26, 3: 26 })
      const two = makeCard('clubs', '2')
      const other = makeCard('clubs', 'A')
      const lead = heartsLegal([two, other], [], false, true, preset.rules)
      expect(lead.map((c) => c.id)).toEqual([two.id])
      const voidOnFirst = heartsLegal(
        [makeCard('hearts', '5'), makeCard('diamonds', '4')],
        [{ seat: 1, card: makeCard('spades', '3') }],
        false,
        true,
        preset.rules,
      )
      expect(voidOnFirst.map((c) => c.suit)).toEqual(['diamonds'])
    })
  }

  it('rotates the pass left, right, across, then hold', () => {
    let s = newHearts()
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      s = dealHearts(s)
      seen.push(s.passDirection)
    }
    expect(seen).toEqual(['left', 'right', 'across', 'hold'])
    expect(s.phase).toBe('playing')
  })

  it('No pass deals straight into the play', () => {
    const rules = HEARTS_HOUSE_PRESETS.find((p) => p.id === 'no-pass')!.rules
    let s = { ...newHearts(), rules }
    s = dealHearts(s)
    expect(s.passDirection).toBe('hold')
    expect(s.phase).toBe('playing')
    expect(s.whoseTurn).not.toBeNull()
    s = dealHearts(s)
    expect(s.phase).toBe('playing')
    expect(s.passDirection).toBe('hold')
  })
})

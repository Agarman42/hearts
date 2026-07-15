import type { GameId } from './games/registry'
import { humanSeats } from './passAndPlay'
import type { UserPrefs } from './prefs'
import { coachKey, LEGACY_KEYS, passAndPlayCoachKey } from './storageKeys'

export interface CoachTip {
  title: string
  body: string
  icon: string
}

export const HEARTS_COACH_TIPS: readonly CoachTip[] = [
  {
    title: 'Play a card',
    body: 'Press a card, drag it up toward the table, then release to play. Pull it back into your hand to cancel.',
    icon: '↑',
  },
  {
    title: 'Pass three',
    body: 'Each hand you pass 3 cards left, right, or across — then hold. Dump dangers (Q♠, high hearts) when you can.',
    icon: '↔',
  },
  {
    title: 'Avoid points… or moon',
    body: 'Hearts are 1 each, Queen of Spades is 13. Take all 26 to shoot the moon and dump them on everyone else.',
    icon: '🌙',
  },
] as const

export const EUCHRE_COACH_TIPS: readonly CoachTip[] = [
  {
    title: 'Kitty & bidding',
    body: 'You get 5 cards. Four sit in the kitty — the top card is face up. Round 1: order that suit as trump or pass. Round 2: name any other suit.',
    icon: '🃏',
  },
  {
    title: 'Dealer discard',
    body: 'When someone orders up, the dealer picks up the kitty card (you will see trump at the table and the new card glowing in your hand). Discard one card — that is not a bidding pass.',
    icon: '↩',
  },
  {
    title: 'Left bower rules',
    body: 'The jack of the trump suit is highest. The same-color jack is the left bower — it counts as trump, not its printed suit.',
    icon: '♣',
  },
  {
    title: 'Make three tricks',
    body: 'The team that orders must take at least 3 of 5 tricks for 1 point. Take all 5 for a march (+2). Fail and the defenders euchre you (+2).',
    icon: '3',
  },
  {
    title: 'Go alone',
    body: 'After ordering trump you can go alone — your partner sits out. Make 3–4 tricks for 1 point, march alone for 4.',
    icon: '🐺',
  },
] as const

export const SPADES_COACH_TIPS: readonly CoachTip[] = [
  {
    title: 'Bid with your partner',
    body: 'You and the player across the table are a team. Your bids add up — cover a nil or sandbag at your peril.',
    icon: '🤝',
  },
  {
    title: 'Follow suit',
    body: 'Play the same suit that was led if you can. Spades are trump, but you cannot lead them until spades are broken.',
    icon: '♠',
  },
  {
    title: 'Bags bite',
    body: 'Extra tricks over your team bid become bags. Ten bags cost you 100 points — sometimes the winning play is to duck.',
    icon: '⚠',
  },
] as const

export const PASS_AND_PLAY_COACH_TIP: CoachTip = {
  title: 'Pass and play',
  body: 'With multiple humans enabled, pass the device when the banner appears. South always shows the active player\'s hand. Hearts passing still goes seat-by-seat.',
  icon: '📱',
}

export function hasSeenPassAndPlayCoach(): boolean {
  try {
    return localStorage.getItem(passAndPlayCoachKey()) === '1'
  } catch {
    return true
  }
}

export function markPassAndPlayCoachSeen(): void {
  try {
    localStorage.setItem(passAndPlayCoachKey(), '1')
  } catch {
    /* ignore */
  }
}

export function gameCoachTips(
  gameId: GameId,
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
): readonly CoachTip[] {
  const base =
    gameId === 'spades'
      ? SPADES_COACH_TIPS
      : gameId === 'euchre'
        ? EUCHRE_COACH_TIPS
        : HEARTS_COACH_TIPS
  if (
    !prefs.passAndPlay ||
    humanSeats(prefs).length <= 1 ||
    hasSeenPassAndPlayCoach()
  ) {
    return base
  }
  return [PASS_AND_PLAY_COACH_TIP, ...base]
}

export function shouldShowCoachTips(
  gameId: GameId,
  prefs: Pick<UserPrefs, 'coachTipsEnabled'>,
): boolean {
  return prefs.coachTipsEnabled && !hasSeenCoach(gameId)
}

export function hasSeenCoach(gameId: GameId = 'hearts'): boolean {
  try {
    if (localStorage.getItem(coachKey(gameId)) === '1') return true
    if (gameId === 'hearts' && localStorage.getItem(LEGACY_KEYS.coach) === '1') {
      localStorage.setItem(coachKey('hearts'), '1')
      return true
    }
    return false
  } catch {
    return true
  }
}

export function markCoachSeen(gameId: GameId = 'hearts'): void {
  try {
    localStorage.setItem(coachKey(gameId), '1')
  } catch {
    /* ignore */
  }
}

export function clearCoachSeen(gameId: GameId = 'hearts'): void {
  try {
    localStorage.removeItem(coachKey(gameId))
  } catch {
    /* ignore */
  }
}
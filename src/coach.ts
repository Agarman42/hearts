import type { GameId } from './games/registry'
import { coachKey } from './storageKeys'

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

export function hasSeenCoach(gameId: GameId = 'hearts'): boolean {
  try {
    return localStorage.getItem(coachKey(gameId)) === '1'
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
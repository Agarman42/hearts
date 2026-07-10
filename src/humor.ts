/**
 * Optional banter lines when Humor mode is on.
 * Kept mild / table-friendly — not mean at kids' tables.
 */

import type { Seat } from './core/types'

const YOUR_TURN = [
  'Your move, legend.',
  'Go on — dump something mean.',
  "Don't feed them the Queen… unless you want chaos.",
  'The table is watching. Dramatically.',
  'Play it cool. Or play the Queen. Same energy.',
]

const AI_THINK = [
  (name: string) => `${name} is consulting the card spirits…`,
  (name: string) => `${name} is overthinking a 3 of clubs.`,
  (name: string) => `${name} whispers to the deck…`,
  (name: string) => `${name} has entered the danger zone.`,
]

const TRICK_WIN = [
  (name: string, pts: number) =>
    pts > 0
      ? `${name} scoops ${pts} — spicy.`
      : `${name} takes a clean empty plate.`,
  (name: string, pts: number) =>
    pts >= 13
      ? `${name} just ate the Queen. Bold.`
      : `${name} wins the trick.`,
  (name: string, pts: number) =>
    pts > 5 ? `${name} collects a small tragedy (+${pts}).` : `${name} claims it.`,
]

const HEARTS_BROKEN = [
  'Hearts are broken. The gloves are off.',
  '♥ is live. Hide your Aces.',
  'Someone let the hearts out. Classic.',
]

const QUEEN = [
  'The Queen has landed. Someone is having a day.',
  '♠Q finds a home. Condolences in advance.',
  'Thirteen points of pure drama.',
]

const MOON = [
  (name: string) => `🌙 ${name} shot the moon! Absolute cinema.`,
  (name: string) => `🌙 ${name} just yeeted 26 points onto everyone else.`,
  (name: string) => `🌙 Moon shot by ${name}. Respect (or fear).`,
]

const PASS = [
  'Pick three gifts. Make them… thoughtful.',
  'Pass like you mean it.',
  'Three cards. One mission. Maximum petty.',
]

const ILLEGAL = [
  'Nice try — illegal though.',
  "The rules called. They're not mad, just disappointed.",
  "That card said 'nope.'",
]

const YOU_WIN = [
  'You win! Lowest score, highest swagger.',
  'Victory! The AI will remember this.',
  'Champion of the velvet table.',
]

const YOU_LOSE = [
  (name: string) => `${name} takes the match. Shake it off.`,
  (name: string) => `GG — ${name} edged you out.`,
  (name: string) => `${name} wins. Rematch energy incoming.`,
]

function pick<T>(arr: T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]!
}

export function humorYourTurn(): string {
  return pick(YOUR_TURN)
}

export function humorAiThinking(name: string): string {
  return pick(AI_THINK)(name)
}

export function humorTrickWin(name: string, pts: number): string {
  return pick(TRICK_WIN)(name, pts)
}

export function humorHeartsBroken(): string {
  return pick(HEARTS_BROKEN)
}

export function humorQueen(): string {
  return pick(QUEEN)
}

export function humorMoon(name: string): string {
  return pick(MOON)(name)
}

export function humorPass(): string {
  return pick(PASS)
}

export function humorIllegal(): string {
  return pick(ILLEGAL)
}

export function humorMatchEnd(winnerName: string, youWon: boolean): string {
  return youWon ? pick(YOU_WIN) : pick(YOU_LOSE)(winnerName)
}

export function humorSeatBanter(_seat: Seat): string | null {
  return null
}

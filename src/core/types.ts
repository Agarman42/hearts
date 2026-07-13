/** Shared primitives for trick-taking card games (Hearts, Spades, Euchre, …). */

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
}

export type Seat = 0 | 1 | 2 | 3

export const SEATS: Seat[] = [0, 1, 2, 3]

/** Deck construction order (arbitrary). */
export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

export const RANKS: Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
]

export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

export const SUIT_COLOR: Record<Suit, 'red' | 'black'> = {
  clubs: 'black',
  diamonds: 'red',
  hearts: 'red',
  spades: 'black',
}

export const SUIT_LABEL: Record<Suit, string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
}

export type AiDifficulty = 'easy' | 'medium' | 'hard'

export interface PlayerProfile {
  seat: Seat
  name: string
  isHuman: boolean
  difficulty: AiDifficulty
  avatarHue: number
}

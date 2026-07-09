export interface Character {
  id: string
  label: string
  emoji: string
  /** CSS gradient fallback */
  gradient: string
  glow: string
  /** Painted portrait under /public/characters */
  portrait: string
}

/** All painted circular portraits — same luxury digital-oil style. */
export const CHARACTERS: Character[] = [
  {
    id: 'ace',
    label: 'Ace',
    emoji: '🃏',
    gradient: 'linear-gradient(145deg, #f59e0b, #b45309)',
    glow: 'rgba(245, 158, 11, 0.45)',
    portrait: '/characters/ace.jpg',
  },
  {
    id: 'queen',
    label: 'Queen',
    emoji: '👑',
    gradient: 'linear-gradient(145deg, #f472b6, #9d174d)',
    glow: 'rgba(244, 114, 182, 0.45)',
    portrait: '/characters/queen.jpg',
  },
  {
    id: 'fox',
    label: 'Fox',
    emoji: '🦊',
    gradient: 'linear-gradient(145deg, #fb923c, #c2410c)',
    glow: 'rgba(251, 146, 60, 0.45)',
    portrait: '/characters/fox.jpg',
  },
  {
    id: 'wolf',
    label: 'Wolf',
    emoji: '🐺',
    gradient: 'linear-gradient(145deg, #94a3b8, #334155)',
    glow: 'rgba(148, 163, 184, 0.4)',
    portrait: '/characters/wolf.jpg',
  },
  {
    id: 'raven',
    label: 'Raven',
    emoji: '🐦‍⬛',
    gradient: 'linear-gradient(145deg, #64748b, #0f172a)',
    glow: 'rgba(100, 116, 139, 0.45)',
    portrait: '/characters/raven.jpg',
  },
  {
    id: 'rose',
    label: 'Rose',
    emoji: '🌹',
    gradient: 'linear-gradient(145deg, #fb7185, #be123c)',
    glow: 'rgba(251, 113, 133, 0.5)',
    portrait: '/characters/rose.jpg',
  },
  {
    id: 'diamond',
    label: 'Diamond',
    emoji: '💎',
    gradient: 'linear-gradient(145deg, #67e8f9, #0369a1)',
    glow: 'rgba(103, 232, 249, 0.45)',
    portrait: '/characters/diamond.jpg',
  },
  {
    id: 'jester',
    label: 'Jester',
    emoji: '🎭',
    gradient: 'linear-gradient(145deg, #c084fc, #6d28d9)',
    glow: 'rgba(192, 132, 252, 0.45)',
    portrait: '/characters/jester.jpg',
  },
  {
    id: 'comet',
    label: 'Comet',
    emoji: '☄️',
    gradient: 'linear-gradient(145deg, #fde68a, #ea580c)',
    glow: 'rgba(253, 230, 138, 0.45)',
    portrait: '/characters/comet.jpg',
  },
  {
    id: 'neon',
    label: 'Neon',
    emoji: '⚡',
    gradient: 'linear-gradient(145deg, #4ade80, #047857)',
    glow: 'rgba(74, 222, 128, 0.45)',
    portrait: '/characters/neon.jpg',
  },
  {
    id: 'phantom',
    label: 'Phantom',
    emoji: '👻',
    gradient: 'linear-gradient(145deg, #e2e8f0, #475569)',
    glow: 'rgba(226, 232, 240, 0.35)',
    portrait: '/characters/phantom.jpg',
  },
  {
    id: 'dragon',
    label: 'Dragon',
    emoji: '🐉',
    gradient: 'linear-gradient(145deg, #f87171, #7f1d1d)',
    glow: 'rgba(248, 113, 113, 0.45)',
    portrait: '/characters/dragon.jpg',
  },
  {
    id: 'leaf',
    label: 'Leaf',
    emoji: '🌿',
    gradient: 'linear-gradient(145deg, #4ade80, #14532d)',
    glow: 'rgba(74, 222, 128, 0.55)',
    portrait: '/characters/leaf.jpg',
  },
  {
    id: 'heart',
    label: 'Heart',
    emoji: '❤️',
    gradient: 'linear-gradient(145deg, #fb7185, #9f1239)',
    glow: 'rgba(251, 113, 133, 0.5)',
    portrait: '/characters/heart.jpg',
  },
  {
    id: 'spade',
    label: 'Spade',
    emoji: '♠️',
    gradient: 'linear-gradient(145deg, #94a3b8, #0f172a)',
    glow: 'rgba(148, 163, 184, 0.4)',
    portrait: '/characters/spade.jpg',
  },
  {
    id: 'club',
    label: 'Club',
    emoji: '♣️',
    gradient: 'linear-gradient(145deg, #86efac, #14532d)',
    glow: 'rgba(134, 239, 172, 0.4)',
    portrait: '/characters/club.jpg',
  },
  {
    id: 'cat',
    label: 'Cat',
    emoji: '🐱',
    gradient: 'linear-gradient(145deg, #fdba74, #9a3412)',
    glow: 'rgba(251, 146, 60, 0.45)',
    portrait: '/characters/cat.jpg',
  },
  {
    id: 'owl',
    label: 'Owl',
    emoji: '🦉',
    gradient: 'linear-gradient(145deg, #c4b5fd, #4c1d95)',
    glow: 'rgba(167, 139, 250, 0.45)',
    portrait: '/characters/owl.jpg',
  },
  {
    id: 'robot',
    label: 'Robot',
    emoji: '🤖',
    gradient: 'linear-gradient(145deg, #67e8f9, #0e7490)',
    glow: 'rgba(34, 211, 238, 0.45)',
    portrait: '/characters/robot.jpg',
  },
  {
    id: 'pirate',
    label: 'Pirate',
    emoji: '🏴‍☠️',
    gradient: 'linear-gradient(145deg, #fbbf24, #78350f)',
    glow: 'rgba(251, 191, 36, 0.45)',
    portrait: '/characters/pirate.jpg',
  },
  {
    id: 'wizard',
    label: 'Wizard',
    emoji: '🧙',
    gradient: 'linear-gradient(145deg, #a78bfa, #5b21b6)',
    glow: 'rgba(167, 139, 250, 0.5)',
    portrait: '/characters/wizard.jpg',
  },
  {
    id: 'skull',
    label: 'Skull',
    emoji: '💀',
    gradient: 'linear-gradient(145deg, #e2e8f0, #334155)',
    glow: 'rgba(226, 232, 240, 0.35)',
    portrait: '/characters/skull.jpg',
  },
  {
    id: 'fire',
    label: 'Fire',
    emoji: '🔥',
    gradient: 'linear-gradient(145deg, #fb923c, #9a3412)',
    glow: 'rgba(251, 146, 60, 0.5)',
    portrait: '/characters/fire.jpg',
  },
  {
    id: 'star',
    label: 'Star',
    emoji: '⭐',
    gradient: 'linear-gradient(145deg, #fde68a, #b45309)',
    glow: 'rgba(253, 230, 138, 0.5)',
    portrait: '/characters/star.jpg',
  },
  {
    id: 'knight',
    label: 'Knight',
    emoji: '🛡️',
    gradient: 'linear-gradient(145deg, #cbd5e1, #1e293b)',
    glow: 'rgba(148, 163, 184, 0.4)',
    portrait: '/characters/knight.jpg',
  },
  {
    id: 'butterfly',
    label: 'Butterfly',
    emoji: '🦋',
    gradient: 'linear-gradient(145deg, #f9a8d4, #9d174d)',
    glow: 'rgba(244, 114, 182, 0.45)',
    portrait: '/characters/butterfly.jpg',
  },
  {
    id: 'ice',
    label: 'Ice',
    emoji: '❄️',
    gradient: 'linear-gradient(145deg, #a5f3fc, #0e7490)',
    glow: 'rgba(103, 232, 249, 0.45)',
    portrait: '/characters/ice.jpg',
  },
  {
    id: 'moon',
    label: 'Moon',
    emoji: '🌙',
    gradient: 'linear-gradient(145deg, #c7d2fe, #312e81)',
    glow: 'rgba(165, 180, 252, 0.45)',
    portrait: '/characters/moon.jpg',
  },
  {
    id: 'dice',
    label: 'Dice',
    emoji: '🎲',
    gradient: 'linear-gradient(145deg, #fca5a5, #991b1b)',
    glow: 'rgba(248, 113, 113, 0.45)',
    portrait: '/characters/dice.jpg',
  },
  {
    id: 'alien',
    label: 'Alien',
    emoji: '👽',
    gradient: 'linear-gradient(145deg, #86efac, #166534)',
    glow: 'rgba(74, 222, 128, 0.4)',
    portrait: '/characters/alien.jpg',
  },
  {
    id: 'crown',
    label: 'Crown',
    emoji: '👑',
    gradient: 'linear-gradient(145deg, #fde047, #a16207)',
    glow: 'rgba(250, 204, 21, 0.5)',
    portrait: '/characters/crown.jpg',
  },
  {
    id: 'music',
    label: 'Music',
    emoji: '🎵',
    gradient: 'linear-gradient(145deg, #f0abfc, #86198f)',
    glow: 'rgba(232, 121, 249, 0.45)',
    portrait: '/characters/music.jpg',
  },
]

const BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<
  string,
  Character
>

export function getCharacter(id: string): Character {
  return BY_ID[id] ?? CHARACTERS[0]
}

export const DEFAULT_CHARACTER_IDS = {
  0: 'ace',
  1: 'fox',
  2: 'wolf',
  3: 'rose',
} as const

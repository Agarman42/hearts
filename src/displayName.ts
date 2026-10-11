const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  v: 'u',
}

/** Whole-name matches. Short or common fragments are exact only. */
const EXACT = new Set([
  'ass',
  'fag',
  'spic',
  'dick',
  'cock',
  'you',
  'dealer',
  'host',
  'partner',
  'north',
  'south',
  'east',
  'west',
])

/** Letter-only names that contain one of these are replaced. */
const CONTAINS = [
  'fuck',
  'fack',
  'shit',
  'bitch',
  'cunt',
  'piss',
  'slut',
  'whore',
  'bastard',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'kike',
  'chink',
  'twat',
]

function lettersOnly(value: string): string {
  let out = ''
  for (const ch of value.toLowerCase()) {
    const mapped = LEET[ch] ?? ch
    if (mapped >= 'a' && mapped <= 'z') out += mapped
  }
  return out
}

function blocked(trimmedLower: string): boolean {
  if (EXACT.has(trimmedLower)) return true
  const letters = lettersOnly(trimmedLower)
  if (!letters) return false
  if (EXACT.has(letters)) return true
  const tokens = trimmedLower.split(/[^a-z0-9@$]+/).map(lettersOnly)
  if (tokens.some((token) => EXACT.has(token))) return true
  return CONTAINS.some((word) => letters.includes(word))
}

/**
 * A name safe to show at the table. Blank, reserved, and blocked names become
 * "Player". "You" can stay for the solo seat, where it is the local label.
 */
export function cleanDisplayName(raw: string, opts?: { keepYou?: boolean }): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, 16)
  if (!trimmed) return 'Player'
  if (opts?.keepYou && trimmed.toLowerCase() === 'you') return trimmed
  if (blocked(trimmed.toLowerCase())) return 'Player'
  return trimmed
}

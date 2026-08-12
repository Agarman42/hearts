export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

export function newRoomCode(rng: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < 4; i++) {
    out += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length)]!
  }
  return out
}

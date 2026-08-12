function toHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0')
  }
  return out
}

/** 16 random bytes as a 32-char hex string. */
export function newPlayerToken(bytes?: () => Uint8Array): string {
  const raw = bytes ? bytes() : globalThis.crypto.getRandomValues(new Uint8Array(16))
  if (raw.length >= 16) return toHex(raw.subarray(0, 16))
  const padded = new Uint8Array(16)
  padded.set(raw)
  return toHex(padded)
}

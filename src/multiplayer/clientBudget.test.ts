import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('friends client request budget', () => {
  it('does not poll the Worker on an interval', () => {
    const src = readFileSync(new URL('./client.ts', import.meta.url), 'utf8')
    expect(src).not.toContain('setInterval')
  })
})
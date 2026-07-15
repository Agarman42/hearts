import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, resolveDefaultDealGame } from './prefs'

describe('resolveDefaultDealGame', () => {
  it('uses activeGameId when defaultDealGame is lastPlayed', () => {
    expect(
      resolveDefaultDealGame({
        ...DEFAULT_PREFS,
        defaultDealGame: 'lastPlayed',
        activeGameId: 'spades',
      }),
    ).toBe('spades')
  })

  it('uses pinned default when set', () => {
    expect(
      resolveDefaultDealGame({
        ...DEFAULT_PREFS,
        defaultDealGame: 'euchre',
        activeGameId: 'hearts',
      }),
    ).toBe('euchre')
  })
})
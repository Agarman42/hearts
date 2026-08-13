import { describe, expect, it } from 'vitest'
import { DEFAULT_SPADES_RULES } from '../games/spades/types'
import { formatRoomRules, sanitizeRoomRules, snapshotRoomRules } from './roomRules'

describe('roomRules', () => {
  it('snapshots host prefs and ignores junk fields', () => {
    const snap = snapshotRoomRules('spades', {
      spadesRules: { ...DEFAULT_SPADES_RULES, nilBids: false, raceTo: 250 },
    })
    expect(snap.gameId).toBe('spades')
    if (snap.gameId === 'spades') {
      expect(snap.spades.nilBids).toBe(false)
      expect(snap.spades.raceTo).toBe(250)
    }
    const clean = sanitizeRoomRules('spades', { gameId: 'spades', spades: { raceTo: 300, evil: true } })
    expect(clean.gameId).toBe('spades')
    if (clean.gameId === 'spades') {
      expect(clean.spades.raceTo).toBe(300)
      expect(clean.spades.nilBids).toBe(true)
      expect('evil' in clean.spades).toBe(false)
    }
  })

  it('formats a short house-rules line', () => {
    const lines = formatRoomRules(
      snapshotRoomRules('hearts', { rules: { raceTo: 50, passCount: 4 } }),
      'hearts',
    )
    expect(lines.some((l) => l.includes('50'))).toBe(true)
    expect(lines.some((l) => l.includes('Pass 4'))).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { createLobby, reduceLobby } from './lobby'
import {
  defaultFillName,
  disambiguateNames,
  displayNamesForViewer,
  isYouName,
  namesForMatch,
  namesForViewerDisplay,
  rewriteStrippedYouCopy,
  sanitizeViewerYouLabel,
} from './identity'

describe('identity', () => {
  it('never uses You as an AI fill name', () => {
    expect(isYouName('You')).toBe(true)
    expect(defaultFillName(0, [])).not.toBe('You')
    expect(defaultFillName(0, [])).toBe('Jules')
    expect(defaultFillName(1, [])).toBe('Angie')
    expect(defaultFillName(2, [])).toBe('Scott')
    expect(defaultFillName(3, [])).toBe('Heather')
  })

  it('disambiguates duplicate display names without blocking', () => {
    const out = disambiguateNames({
      0: 'Scott',
      1: 'Scott',
      2: 'Angie',
      3: 'Scott',
    })
    expect(out[0]).toBe('Scott')
    expect(out[1]).toBe('Scott 2')
    expect(out[2]).toBe('Angie')
    expect(out[3]).toBe('Scott 3')
  })

  it('after partner-with-neighbor, vacated south is not You and Scotts disambiguate', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'euchre', hostId: 'p0', hostName: 'Scott' })
    l = reduceLobby(l, { type: 'hello', name: 'Scott' }, 'p1').state
    expect(l.chairs[1]?.playerId).toBe('p1')
    l = reduceLobby(l, { type: 'sit_relative', vsSeat: 1, relation: 'partner' }, 'p0').state
    expect(l.chairs[3]?.playerId).toBe('p0')
    expect(l.chairs[1]?.playerId).toBe('p1')
    expect(l.chairs[0]).toBeNull()

    const names = namesForMatch(l)
    expect(names[3]).toBe('Scott')
    expect(names[1]).toBe('Scott')
    expect(names[0]).not.toBe('You')
    expect(isYouName(names[0])).toBe(false)
    expect(names[2]).not.toBe('Scott')
  })

  it('viewer-relative display keeps local Scott and suffixes the other', () => {
    const shown = displayNamesForViewer(
      { 0: 'Jules', 1: 'Scott', 2: 'Heather', 3: 'Scott' },
      3,
    )
    expect(shown[3]).toBe('Scott')
    expect(shown[1]).toBe('Scott 2')
  })

  it('strips leftover You from non-viewer chairs (vacated south)', () => {
    const cleaned = sanitizeViewerYouLabel(
      { 0: 'You', 1: 'Scott', 2: 'Heather', 3: 'Scott' },
      3,
    )
    expect(cleaned[3]).toBe('Scott')
    expect(cleaned[0]).not.toBe('You')
    expect(isYouName(cleaned[0])).toBe(false)
  })

  it('scoreboard partner labels never show You on a non-viewer seat', () => {
    const raw = { 0: 'You', 1: 'Scott', 2: 'Heather', 3: 'Scott' }
    const shown = namesForViewerDisplay(raw, 3)
    expect(isYouName(shown[0])).toBe(false)
    expect(shown[3]).toBe('Scott')
    expect(`${shown[0]} & ${shown[2]}`).not.toMatch(/\bYou\b/)
    expect(rewriteStrippedYouCopy('You passes.', raw, shown)).toBe(`${shown[0]} passes.`)
  })

  it('honors host-edited fill names on empty chairs', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    l = reduceLobby(l, { type: 'sit_relative', vsSeat: 1, relation: 'partner' }, 'p0').state
    l = reduceLobby(l, { type: 'set_name', seat: 2, name: 'Righty' }, 'p0').state
    expect(l.fillNames[2]).toBe('Righty')
    const names = namesForMatch(l)
    expect(names[2]).toBe('Righty')
    expect(names[0]).not.toBe('You')
  })
})

import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS } from '../prefs'
import { isYourSeat, viewerPartnership } from '../passAndPlay'
import { partnershipScoreRows } from '../core/teamLabels'
import { createLobby, reduceLobby } from './lobby'
import { isYouName, namesForMatch, sanitizeViewerYouLabel } from './identity'
import { namesOnScreen, screenSlot, seatOfPlayer } from './seats'

const solo = { passAndPlay: false, humanSeats: DEFAULT_PREFS.humanSeats } as const

describe('partner swap → Us/Them and You follow mySeat', () => {
  function partnerSwapOntoEast() {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Scott' })
    l = reduceLobby(l, { type: 'hello', name: 'Scott' }, 'p1').state
    l = reduceLobby(l, { type: 'sit_relative', vsSeat: 1, relation: 'partner' }, 'p0').state
    return l
  }

  it('host mySeat becomes 3 (EW) and vacated south is visual left, not You', () => {
    const l = partnerSwapOntoEast()
    const mySeat = seatOfPlayer(l.chairs, 'p0')
    expect(mySeat).toBe(3)
    expect(screenSlot(3, 3)).toBe(0)
    expect(screenSlot(0, 3)).toBe(1)
    expect(l.chairs[0]).toBeNull()

    const names = namesForMatch(l)
    expect(names[3]).toBe('Scott')
    expect(names[0]).not.toBe('You')
    expect(isYourSeat(0, solo, mySeat)).toBe(false)
    expect(isYourSeat(3, solo, mySeat)).toBe(true)

    const leftoverYou = sanitizeViewerYouLabel(
      { 0: 'You', 1: 'Scott', 2: 'Heather', 3: 'Scott' },
      mySeat,
    )
    const screen = namesOnScreen(leftoverYou, mySeat)
    expect(screen[0]).toBe('Scott')
    expect(screen[1]).not.toBe('You')
    expect(isYouName(screen[1])).toBe(false)
  })

  it('Spades/Euchre Us/Them follow EW after that rotate, not sticky NS', () => {
    const l = partnerSwapOntoEast()
    const mySeat = seatOfPlayer(l.chairs, 'p0')
    expect(viewerPartnership(solo, mySeat)).toBe('ew')
    expect(viewerPartnership(solo, null)).toBe('ns')

    const rows = partnershipScoreRows({ ns: 9, ew: 2 }, viewerPartnership(solo, mySeat))
    expect(rows[0]).toMatchObject({ id: 'ew', label: 'Us', score: 2 })
    expect(rows[1]).toMatchObject({ id: 'ns', label: 'Them', score: 9 })
  })

  it('right-hand empty chair stays renameable after rotate', () => {
    let l = partnerSwapOntoEast()
    const named = reduceLobby(l, { type: 'set_name', seat: 2, name: 'Righty' }, 'p0')
    expect(named.error).toBeUndefined()
    expect(namesForMatch(named.state)[2]).toBe('Righty')
  })
})

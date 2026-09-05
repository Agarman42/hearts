import { describe, expect, it } from 'vitest'
import { partnershipScoreRows, relabelUsThemCopy, teamLabel } from './teamLabels'

describe('euchre viewer team labels', () => {
  it('maps Us/Them from the viewer partnership, not compass NS', () => {
    expect(teamLabel('ew', 'ew')).toBe('Us')
    expect(teamLabel('ns', 'ew')).toBe('Them')
    expect(teamLabel('ns', 'ns')).toBe('Us')
  })

  it('rewrites NS-authored engine copy for an EW viewer after partner swap', () => {
    expect(relabelUsThemCopy('Us euchre!', 'ew')).toBe('Them euchre!')
    expect(relabelUsThemCopy('Them march!', 'ew')).toBe('Us march!')
    expect(relabelUsThemCopy('Us wins the match!', 'ew')).toBe('Them wins the match!')
    expect(relabelUsThemCopy('Them euchre!', 'ns')).toBe('Them euchre!')
  })

  it('lists Us then Them with EW seats on top when the viewer is east/west', () => {
    const rows = partnershipScoreRows({ ns: 8, ew: 2 }, 'ew')
    expect(rows[0]).toMatchObject({ id: 'ew', label: 'Us', score: 2, seats: [1, 3] })
    expect(rows[1]).toMatchObject({ id: 'ns', label: 'Them', score: 8, seats: [0, 2] })
  })
})

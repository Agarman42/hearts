import { describe, expect, it } from 'vitest'
import {
  formatEuchreHandMessage,
  formatEuchreMatchMessage,
  teamLabel,
} from './labels'

const nsEuchre = {
  makerTeam: 'ns' as const,
  euchred: true,
  marched: false,
  loner: false,
  points: { ns: 0, ew: 2 },
}

const ewMarch = {
  makerTeam: 'ew' as const,
  euchred: false,
  marched: true,
  loner: false,
  points: { ns: 0, ew: 2 },
}

describe('formatEuchreHandMessage', () => {
  it('keeps NS-authored Us/Them when the viewer is south', () => {
    expect(formatEuchreHandMessage(nsEuchre, 'ns')).toBe('Them euchre!')
    expect(formatEuchreHandMessage(ewMarch, 'ns')).toBe('Them march!')
  })

  it('flips Us/Them when the viewer is east/west after partner swap', () => {
    expect(formatEuchreHandMessage(nsEuchre, 'ew')).toBe('Us euchre!')
    expect(formatEuchreHandMessage(ewMarch, 'ew')).toBe('Us march!')
    expect(formatEuchreMatchMessage('ns', 'ew')).toBe('Them wins the match!')
    expect(teamLabel('ew', 'ew')).toBe('Us')
  })
})

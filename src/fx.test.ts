import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fxDeal,
  fxHandEnd,
  fxPlayCard,
  mayPlaySound,
  noteSoundGesture,
  resetSoundGestureForTests,
  setSoundVolumeScale,
  soundUnlockedForPlay,
} from './fx'

let voices = 0
let resumes = 0

class FakeAudioContext {
  state = 'suspended'
  currentTime = 0
  sampleRate = 8000
  destination = {}

  resume() {
    resumes += 1
    this.state = 'running'
    return Promise.resolve()
  }

  createOscillator() {
    voices += 1
    return {
      type: 'sine',
      frequency: { setValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    }
  }

  createGain() {
    return {
      gain: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect() {},
    }
  }

  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(Math.max(1, length)) }
  }

  createBufferSource() {
    voices += 1
    return {
      buffer: null,
      connect() {},
      start() {},
    }
  }
}

const on = { soundEnabled: true, hapticsEnabled: false }
const off = { soundEnabled: false, hapticsEnabled: false }

afterEach(() => {
  resetSoundGestureForTests()
  voices = 0
  resumes = 0
  vi.unstubAllGlobals()
})

describe('table sound', () => {
  it('stays silent until the player has tapped and turned sound on', () => {
    resetSoundGestureForTests()
    expect(mayPlaySound(false, false)).toBe(false)
    expect(mayPlaySound(true, false)).toBe(false)
    expect(mayPlaySound(false, true)).toBe(false)
    expect(mayPlaySound(true, true)).toBe(true)
    expect(soundUnlockedForPlay()).toBe(false)
    vi.stubGlobal('window', { AudioContext: FakeAudioContext })
    noteSoundGesture()
    expect(soundUnlockedForPlay()).toBe(true)
    expect(resumes).toBe(1)
  })

  it('does not start a voice until sound is on and a gesture has resumed audio', () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext })

    fxDeal(off)
    fxPlayCard(on)
    fxHandEnd(on)
    expect(voices).toBe(0)
    expect(resumes).toBe(0)

    noteSoundGesture()
    expect(resumes).toBe(1)
    fxDeal(off)
    fxPlayCard(off)
    fxHandEnd(off)
    expect(voices).toBe(0)

    resetSoundGestureForTests()
    voices = 0
    resumes = 0
    fxDeal(on)
    fxPlayCard(on)
    fxHandEnd(on)
    expect(voices).toBe(0)

    noteSoundGesture()
    const before = voices
    fxPlayCard(on)
    fxDeal(on)
    fxHandEnd(on)
    expect(voices - before).toBe(1 + 2 + 4)
  })

  it('stays silent at volume zero instead of throwing', () => {
    vi.stubGlobal('window', { AudioContext: FakeAudioContext })
    setSoundVolumeScale(0)
    noteSoundGesture()
    expect(() => {
      fxPlayCard(on)
      fxDeal(on)
      fxHandEnd(on)
    }).not.toThrow()
    expect(voices).toBe(0)
  })
})

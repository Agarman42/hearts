import { describe, expect, it } from 'vitest'
import { HAND_TAP_SLOP_PX, shouldCommitPlay } from './handPlayGesture'

describe('shouldCommitPlay', () => {
  const base = {
    startX: 100,
    startY: 400,
    playLineY: 350,
  }

  it('commits on tap with minimal movement', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 100 + HAND_TAP_SLOP_PX - 2,
        releaseY: 400,
      }),
    ).toBe(true)
  })

  it('cancels when dragged sideways without play intent', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 160,
        releaseY: 405,
      }),
    ).toBe(false)
  })

  it('commits when released above the play line', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 110,
        releaseY: 300,
      }),
    ).toBe(true)
  })

  it('commits on upward flick', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 102,
        releaseY: 360,
      }),
    ).toBe(true)
  })

  it('commits on right flick in left-hand layout', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 140,
        releaseY: 402,
        leftHandLayout: true,
      }),
    ).toBe(true)
  })
})
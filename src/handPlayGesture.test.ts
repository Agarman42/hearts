import { describe, expect, it } from 'vitest'
import { HAND_TAP_SLOP_PX, shouldCommitPlay } from './handPlayGesture'

const PLAYER_BOX_TOP = 350

describe('shouldCommitPlay', () => {
  const base = {
    startX: 100,
    startY: 400,
    playLineY: PLAYER_BOX_TOP,
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

  it('cancels short upward drag that does not clear the player box', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 102,
        releaseY: 360,
      }),
    ).toBe(false)
  })

  it('cancels right flick that stays below the player box', () => {
    expect(
      shouldCommitPlay({
        ...base,
        releaseX: 140,
        releaseY: 402,
        leftHandLayout: true,
      }),
    ).toBe(false)
  })
})
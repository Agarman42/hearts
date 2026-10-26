import { useCallback, useEffect, useRef, useState } from 'react'
import { claimPlayLock, PLAY_LOCK_MS } from '../multiplayer/playLock'

/**
 * Block a second online card until the table state changes.
 * The change is the server snapshot, whether the card was accepted or returned.
 * A dropped reply releases the lock so the hand does not stay frozen.
 */
export function useOnlinePlayLock(revision: unknown, onRelease: () => void): (cardId: string) => boolean {
  const held = useRef<string | null>(null)
  const releaseRef = useRef(onRelease)
  releaseRef.current = onRelease
  const [claimTick, setClaimTick] = useState(0)

  const release = () => {
    if (!held.current) return
    held.current = null
    releaseRef.current()
  }

  useEffect(() => {
    release()
  }, [revision])

  useEffect(() => {
    if (!held.current) return
    const timer = window.setTimeout(release, PLAY_LOCK_MS)
    return () => window.clearTimeout(timer)
  }, [claimTick, revision])

  return useCallback((cardId: string) => {
    const next = claimPlayLock(held.current, cardId)
    held.current = next.held
    if (next.claimed) setClaimTick((n) => n + 1)
    return next.claimed
  }, [])
}

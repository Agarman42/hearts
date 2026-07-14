import { useCallback, useEffect, useState } from 'react'
import type { Seat } from '../core/types'
import type { UserPrefs } from '../prefs'
import { humanSeats, needsPassPrompt } from '../passAndPlay'

export function usePassReady(
  whoseTurn: Seat | null,
  prefs: Pick<UserPrefs, 'passAndPlay' | 'humanSeats'>,
) {
  const [ready, setReady] = useState<Seat | null>(null)
  const count = humanSeats(prefs).length

  useEffect(() => {
    if (!prefs.passAndPlay || count <= 1) {
      setReady(whoseTurn)
      return
    }
    setReady((prev) => (prev === whoseTurn ? prev : null))
  }, [whoseTurn, prefs.passAndPlay, count])

  const showPass = needsPassPrompt({ whoseTurn }, prefs, ready)
  const acknowledge = useCallback(() => {
    if (whoseTurn != null) setReady(whoseTurn)
  }, [whoseTurn])

  return { showPass, acknowledge, canAct: !showPass }
}
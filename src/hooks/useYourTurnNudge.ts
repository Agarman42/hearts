import { useEffect, useRef } from 'react'
import type { Seat } from '../core/types'
import { fxYourTurn, type FxPrefs } from '../fx'
import type { ProjectedState } from '../multiplayer/protocol'

function isMyAction(view: ProjectedState, mySeat: Seat): boolean {
  const phase = view.state.phase
  if (phase === 'passing') {
    if (view.gameId !== 'hearts') return false
    return !view.state.passSelections[mySeat]?.length
  }
  if (
    phase === 'playing' ||
    phase === 'bidding' ||
    phase === 'discard' ||
    phase === 'loner_choice'
  ) {
    return view.state.whoseTurn === mySeat
  }
  return false
}

export function ensureTurnNotifications(): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

export function useYourTurnNudge(
  view: ProjectedState | null,
  mySeat: Seat | null,
  prefs: FxPrefs,
): void {
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    ensureTurnNotifications()
  }, [])

  useEffect(() => {
    if (!view || mySeat == null || !isMyAction(view, mySeat)) {
      lastKey.current = null
      return
    }
    const key = `${view.gameId}-${view.state.phase}-${view.state.whoseTurn}-${view.state.handNumber}`
    if (lastKey.current === key) return
    lastKey.current = key

    fxYourTurn(prefs)
    if (typeof document !== 'undefined' && document.hidden && typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        try {
          new Notification('Your turn', {
            body: 'Card Parlour is waiting on you.',
            tag: 'card-parlour-turn',
            silent: false,
          })
        } catch {
          /* ignore */
        }
      }
    }
  }, [view, mySeat, prefs])
}

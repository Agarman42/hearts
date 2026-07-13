import { useCallback, useEffect, useRef, useState } from 'react'
import type { Achievement } from '../achievements'
import { checkTrophyCase } from '../trophyCase'
import { useAchievementToast } from './useAchievementToast'

export type AppScreen = 'home' | 'table' | 'settings' | 'stats'

export interface GameShellOptions {
  initialScreen?: AppScreen
}

export function useGameShell(opts: GameShellOptions = {}) {
  const [screen, setScreen] = useState<AppScreen>(opts.initialScreen ?? 'home')
  const timerRef = useRef<number | null>(null)
  const {
    toast: achievementToast,
    queueUnlocks: pushUnlocks,
    dismiss: dismissAchievementToast,
  } = useAchievementToast()

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const queueUnlocks = useCallback(
    (achievements: Achievement[]) => {
      if (!achievements.length) {
        const trophies = checkTrophyCase()
        if (trophies.length) pushUnlocks(trophies)
        return
      }
      const trophies = checkTrophyCase()
      pushUnlocks([...achievements, ...trophies])
    },
    [pushUnlocks],
  )

  return {
    screen,
    setScreen,
    timerRef,
    clearTimer,
    achievementToast,
    dismissAchievementToast,
    queueUnlocks,
  }
}

export type GameShell = ReturnType<typeof useGameShell>
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Achievement } from '../achievements'
import { checkGlobalAchievements } from '../achievements/global'
import { checkTrophyCase } from '../trophyCase'
import { useAchievementToast } from './useAchievementToast'

export type AppScreen = 'home' | 'table' | 'settings' | 'stats'

export interface GameShellOptions {
  initialScreen?: AppScreen
}

export function useGameShell(opts: GameShellOptions = {}) {
  const [screen, setScreen] = useState<AppScreen>(opts.initialScreen ?? 'home')
  const settingsReturnRef = useRef<Extract<AppScreen, 'home' | 'table'>>('home')
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
      const global = checkGlobalAchievements()
      const trophies = checkTrophyCase()
      const all = [...achievements, ...global, ...trophies]
      if (all.length) pushUnlocks(all)
    },
    [pushUnlocks],
  )

  const openSettings = useCallback((from: 'home' | 'table') => {
    settingsReturnRef.current = from
    setScreen('settings')
  }, [])

  const closeSettings = useCallback(() => {
    setScreen(settingsReturnRef.current)
  }, [])

  return {
    screen,
    setScreen,
    openSettings,
    closeSettings,
    timerRef,
    clearTimer,
    achievementToast,
    dismissAchievementToast,
    queueUnlocks,
  }
}

export type GameShell = ReturnType<typeof useGameShell>
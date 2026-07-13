import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AvailableGameId, GameId } from '../games/registry'
import { hasSavedGame } from '../gameSave'
import { loadPrefs, savePrefs } from '../prefs'
import { useGameShell } from './useGameShell'
import { useHeartsGame } from './useHeartsGame'
import { useSpadesGame } from './useSpadesGame'

function initialActiveGame(): GameId {
  if (hasSavedGame('spades')) return 'spades'
  if (hasSavedGame('hearts')) return 'hearts'
  return loadPrefs().activeGameId ?? 'hearts'
}

function initialScreen(): 'home' | 'table' {
  return hasSavedGame('hearts') || hasSavedGame('spades') ? 'table' : 'home'
}

export function useCardTable() {
  const shell = useGameShell({ initialScreen: initialScreen() })
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [activeGame, setActiveGame] = useState<GameId>(initialActiveGame)

  useEffect(() => {
    if (activeGame === 'euchre') return
    savePrefs({ ...prefs, activeGameId: activeGame as AvailableGameId })
  }, [prefs, activeGame])

  const heartsPaused = activeGame !== 'hearts'
  const spadesPaused = activeGame !== 'spades'

  const hearts = useHeartsGame({ shell, prefs, setPrefs, paused: heartsPaused })
  const spades = useSpadesGame({ shell, prefs, setPrefs, paused: spadesPaused })

  const saves = useMemo(
    () => ({
      hearts: hearts.hasSave,
      spades: spades.hasSave,
    }),
    [hearts.hasSave, spades.hasSave],
  )

  const playGame = useCallback(
    (gameId: GameId) => {
      setActiveGame(gameId)
      if (gameId === 'hearts') hearts.play()
      else if (gameId === 'spades') spades.play()
      shell.setScreen('table')
    },
    [hearts, spades, shell],
  )

  const continueGame = useCallback(
    (gameId: GameId) => {
      setActiveGame(gameId)
      const ok =
        gameId === 'hearts' ? hearts.continueGame() : gameId === 'spades' ? spades.continueGame() : false
      if (ok) shell.setScreen('table')
    },
    [hearts, spades, shell],
  )

  const quitToHome = useCallback(() => shell.setScreen('home'), [shell])

  const abandonGame = useCallback(() => {
    if (activeGame === 'hearts') hearts.abandonGame()
    else if (activeGame === 'spades') spades.abandonGame()
    shell.setScreen('home')
  }, [activeGame, hearts, spades, shell])

  const sharedPrefs = {
    setGameSpeed: activeGame === 'spades' ? spades.setGameSpeed : hearts.setGameSpeed,
    setAutoFinishHand: hearts.setAutoFinishHand,
    setFeltStyle: activeGame === 'spades' ? spades.setFeltStyle : hearts.setFeltStyle,
    setCardBack: activeGame === 'spades' ? spades.setCardBack : hearts.setCardBack,
    setHapticsEnabled: activeGame === 'spades' ? spades.setHapticsEnabled : hearts.setHapticsEnabled,
    setHumorMode: activeGame === 'spades' ? spades.setHumorMode : hearts.setHumorMode,
  }

  return {
    activeGame,
    screen: shell.screen,
    setScreen: shell.setScreen,
    prefs,
    saves,
    playGame,
    continueGame,
    quitToHome,
    abandonGame,
    achievementToast: shell.achievementToast,
    dismissAchievementToast: shell.dismissAchievementToast,
    hearts,
    spades,
    sharedPrefs,
    startOver: activeGame === 'spades' ? spades.startOver : hearts.startOver,
    onUpdateDifficulty:
      activeGame === 'spades' ? spades.onUpdateDifficulty : hearts.onUpdateDifficulty,
    onUpdateName: activeGame === 'spades' ? spades.onUpdateName : hearts.onUpdateName,
    onUpdateCharacter:
      activeGame === 'spades' ? spades.onUpdateCharacter : hearts.onUpdateCharacter,
    onUpdateRules: hearts.onUpdateRules,
    tableState: activeGame === 'spades' ? spades.state : hearts.state,
  }
}
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AvailableGameId, GameId } from '../games/registry'
import { getLatestSave, hasSavedGame } from '../gameSave'
import { loadPrefs, savePrefs } from '../prefs'
import { useGameShell } from './useGameShell'
import { useHeartsGame } from './useHeartsGame'
import { useSpadesGame } from './useSpadesGame'
import { useEuchreGame } from './useEuchreGame'

function initialActiveGame(): GameId {
  const latest = getLatestSave()
  if (latest) return latest.gameId
  return loadPrefs().activeGameId ?? 'hearts'
}

function initialScreen(): 'home' | 'table' {
  return hasSavedGame('hearts') || hasSavedGame('spades') || hasSavedGame('euchre')
    ? 'table'
    : 'home'
}

export function useCardTable() {
  const shell = useGameShell({ initialScreen: initialScreen() })
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [activeGame, setActiveGame] = useState<GameId>(initialActiveGame)

  useEffect(() => {
    savePrefs({ ...prefs, activeGameId: activeGame as AvailableGameId })
  }, [prefs, activeGame])

  const heartsPaused = activeGame !== 'hearts'
  const spadesPaused = activeGame !== 'spades'
  const euchrePaused = activeGame !== 'euchre'

  const hearts = useHeartsGame({ shell, prefs, setPrefs, paused: heartsPaused })
  const spades = useSpadesGame({ shell, prefs, setPrefs, paused: spadesPaused })
  const euchre = useEuchreGame({ shell, prefs, setPrefs, paused: euchrePaused })

  const saves = useMemo(
    () => ({
      hearts: hearts.hasSave,
      spades: spades.hasSave,
      euchre: euchre.hasSave,
    }),
    [hearts.hasSave, spades.hasSave, euchre.hasSave],
  )

  const playGame = useCallback(
    (gameId: GameId) => {
      setActiveGame(gameId)
      if (gameId === 'hearts') hearts.play()
      else if (gameId === 'spades') spades.play()
      else if (gameId === 'euchre') euchre.play()
      shell.setScreen('table')
    },
    [hearts, spades, euchre, shell],
  )

  const continueGame = useCallback(
    (gameId: GameId) => {
      setActiveGame(gameId)
      const ok =
        gameId === 'hearts'
          ? hearts.continueGame()
          : gameId === 'spades'
            ? spades.continueGame()
            : gameId === 'euchre'
              ? euchre.continueGame()
              : false
      if (ok) shell.setScreen('table')
    },
    [hearts, spades, euchre, shell],
  )

  const quitToHome = useCallback(() => shell.setScreen('home'), [shell])

  const abandonGame = useCallback(() => {
    if (activeGame === 'hearts') hearts.abandonGame()
    else if (activeGame === 'spades') spades.abandonGame()
    else if (activeGame === 'euchre') euchre.abandonGame()
    shell.setScreen('home')
  }, [activeGame, hearts, spades, euchre, shell])

  const sharedPrefs = {
    setGameSpeed:
      activeGame === 'euchre'
        ? euchre.setGameSpeed
        : activeGame === 'spades'
          ? spades.setGameSpeed
          : hearts.setGameSpeed,
    setAutoFinishHand: hearts.setAutoFinishHand,
    setFeltStyle:
      activeGame === 'euchre'
        ? euchre.setFeltStyle
        : activeGame === 'spades'
          ? spades.setFeltStyle
          : hearts.setFeltStyle,
    setCardBack:
      activeGame === 'euchre'
        ? euchre.setCardBack
        : activeGame === 'spades'
          ? spades.setCardBack
          : hearts.setCardBack,
    setHapticsEnabled:
      activeGame === 'euchre'
        ? euchre.setHapticsEnabled
        : activeGame === 'spades'
          ? spades.setHapticsEnabled
          : hearts.setHapticsEnabled,
    setSoundEnabled:
      activeGame === 'euchre'
        ? euchre.setSoundEnabled
        : activeGame === 'spades'
          ? spades.setSoundEnabled
          : hearts.setSoundEnabled,
    setHumorMode:
      activeGame === 'euchre'
        ? euchre.setHumorMode
        : activeGame === 'spades'
          ? spades.setHumorMode
          : hearts.setHumorMode,
    setPassAndPlay:
      activeGame === 'euchre'
        ? euchre.setPassAndPlay
        : activeGame === 'spades'
          ? spades.setPassAndPlay
          : hearts.setPassAndPlay,
    setHumanSeat:
      activeGame === 'euchre'
        ? euchre.setHumanSeat
        : activeGame === 'spades'
          ? spades.setHumanSeat
          : hearts.setHumanSeat,
  }

  const startOver =
    activeGame === 'euchre'
      ? euchre.startOver
      : activeGame === 'spades'
        ? spades.startOver
        : hearts.startOver

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
    euchre,
    sharedPrefs,
    startOver,
    onUpdateDifficulty:
      activeGame === 'euchre'
        ? euchre.onUpdateDifficulty
        : activeGame === 'spades'
          ? spades.onUpdateDifficulty
          : hearts.onUpdateDifficulty,
    onUpdateName:
      activeGame === 'euchre'
        ? euchre.onUpdateName
        : activeGame === 'spades'
          ? spades.onUpdateName
          : hearts.onUpdateName,
    onUpdateCharacter:
      activeGame === 'euchre'
        ? euchre.onUpdateCharacter
        : activeGame === 'spades'
          ? spades.onUpdateCharacter
          : hearts.onUpdateCharacter,
    onUpdateRules: hearts.onUpdateRules,
    onUpdateSpadesRules: spades.onUpdateSpadesRules,
    onUpdateEuchreRules: euchre.onUpdateEuchreRules,
    tableState:
      activeGame === 'euchre'
        ? euchre.state
        : activeGame === 'spades'
          ? spades.state
          : hearts.state,
  }
}
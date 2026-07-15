import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiDifficulty, Seat } from '../core/types'
import type { AvailableGameId, GameId } from '../games/registry'
import { getLatestSave } from '../gameSave'
import { loadPrefs, savePrefs } from '../prefs'
import { isGameHookPaused } from './gamePause'
import { useGameShell } from './useGameShell'
import { useHeartsGame } from './useHeartsGame'
import { useSpadesGame } from './useSpadesGame'
import { useEuchreGame } from './useEuchreGame'

function initialActiveGame(): GameId {
  const latest = getLatestSave()
  if (latest) return latest.gameId
  return loadPrefs().activeGameId ?? 'hearts'
}

export function useCardTable() {
  const shell = useGameShell({ initialScreen: 'home' })
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [activeGame, setActiveGame] = useState<GameId>(initialActiveGame)
  const [statsGame, setStatsGame] = useState<AvailableGameId>('hearts')
  const [homeEpoch, setHomeEpoch] = useState(0)

  useEffect(() => {
    savePrefs({ ...prefs, activeGameId: activeGame as AvailableGameId })
  }, [prefs, activeGame])

  const heartsPaused = isGameHookPaused(activeGame, shell.screen, 'hearts')
  const spadesPaused = isGameHookPaused(activeGame, shell.screen, 'spades')
  const euchrePaused = isGameHookPaused(activeGame, shell.screen, 'euchre')

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

  const openStats = useCallback(
    (gameId?: AvailableGameId) => {
      if (gameId) setStatsGame(gameId)
      shell.setScreen('stats')
    },
    [shell],
  )

  const bumpHome = useCallback(() => setHomeEpoch((e) => e + 1), [])

  const quitToHome = useCallback(() => {
    shell.setScreen('home')
    bumpHome()
  }, [shell, bumpHome])

  const abandonGame = useCallback(() => {
    if (activeGame === 'hearts') hearts.abandonGame()
    else if (activeGame === 'spades') spades.abandonGame()
    else if (activeGame === 'euchre') euchre.abandonGame()
    shell.setScreen('home')
    bumpHome()
  }, [activeGame, hearts, spades, euchre, shell, bumpHome])

  const patchPrefs = useCallback(
    (patch: Partial<typeof prefs>) => setPrefs((p) => ({ ...p, ...patch })),
    [setPrefs],
  )

  /** Seats are shared across games — sync prefs + in-progress state for every hook. */
  const onUpdateDifficulty = useCallback(
    (seat: Seat, d: AiDifficulty) => {
      hearts.onUpdateDifficulty(seat, d)
      spades.onUpdateDifficulty(seat, d)
      euchre.onUpdateDifficulty(seat, d)
    },
    [hearts, spades, euchre],
  )

  const onUpdateName = useCallback(
    (seat: Seat, name: string) => {
      hearts.onUpdateName(seat, name)
      spades.onUpdateName(seat, name)
      euchre.onUpdateName(seat, name)
    },
    [hearts, spades, euchre],
  )

  const onUpdateCharacter = useCallback(
    (seat: Seat, characterId: string) => {
      hearts.onUpdateCharacter(seat, characterId)
      spades.onUpdateCharacter(seat, characterId)
      euchre.onUpdateCharacter(seat, characterId)
    },
    [hearts, spades, euchre],
  )

  const sharedPrefs = {
    setCoachTipsEnabled: (coachTipsEnabled: boolean) => patchPrefs({ coachTipsEnabled }),
    setReduceMotion: (reduceMotion: boolean) => patchPrefs({ reduceMotion }),
    setShowCareerBar: (showCareerBar: boolean) => patchPrefs({ showCareerBar }),
    setShowDailyChallenges: (showDailyChallenges: boolean) =>
      patchPrefs({ showDailyChallenges }),
    setShowRecentMatches: (showRecentMatches: boolean) =>
      patchPrefs({ showRecentMatches }),
    setLeftHandLayout: (leftHandLayout: boolean) => patchPrefs({ leftHandLayout }),
    setHumorIntensity: (humorIntensity: import('../prefs').HumorIntensity) =>
      patchPrefs({ humorIntensity }),
    setSoundVolume: (soundVolume: number) =>
      patchPrefs({ soundVolume: Math.max(0, Math.min(100, Math.round(soundVolume))) }),
    setCardSize: (cardSize: import('../prefs').CardSize) => patchPrefs({ cardSize }),
    setDefaultDealGame: (defaultDealGame: import('../prefs').DefaultDealGame) =>
      patchPrefs({ defaultDealGame }),
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
    statsGame,
    screen: shell.screen,
    setScreen: shell.setScreen,
    openStats,
    openSettings: shell.openSettings,
    closeSettings: shell.closeSettings,
    homeEpoch,
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
    onUpdateDifficulty,
    onUpdateName,
    onUpdateCharacter,
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
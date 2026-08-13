import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiDifficulty, Seat } from '../core/types'
import type { AvailableGameId, GameId } from '../games/registry'
import { getLatestSave } from '../gameSave'
import { DEFAULT_NAMES, loadPrefs, savePrefs } from '../prefs'
import { isGameHookPaused } from './gamePause'
import { normalizeRoomCode } from '../multiplayer/lastRoom'
import { useGameShell } from './useGameShell'
import { useHeartsGame } from './useHeartsGame'
import { useSpadesGame } from './useSpadesGame'
import { useEuchreGame } from './useEuchreGame'

function initialActiveGame(): GameId {
  const latest = getLatestSave()
  if (latest) return latest.gameId
  return loadPrefs().activeGameId ?? 'hearts'
}

function isGameId(value: string | null): value is GameId {
  return value === 'hearts' || value === 'spades' || value === 'euchre'
}

function roomFromSearch(): { code: string; gameId: GameId } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('room')?.trim().toUpperCase()
  if (!raw || raw.length < 4) return null
  const game = params.get('game')
  return { code: raw.slice(0, 4), gameId: isGameId(game) ? game : 'hearts' }
}

function clearRoomSearch(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('room') && !url.searchParams.has('game')) return
  url.searchParams.delete('room')
  url.searchParams.delete('game')
  const q = url.searchParams.toString()
  window.history.replaceState({}, '', `${url.pathname}${q ? `?${q}` : ''}${url.hash}`)
}

export type StatsFocus = 'default' | 'daily-challenges'

export type StatsOpenArg =
  | AvailableGameId
  | { gameId?: AvailableGameId; focus?: StatsFocus }

function resolveStatsOpen(arg?: StatsOpenArg): {
  gameId?: AvailableGameId
  focus: StatsFocus
} {
  if (!arg) return { focus: 'default' }
  if (typeof arg === 'string') return { gameId: arg, focus: 'default' }
  return { gameId: arg.gameId, focus: arg.focus ?? 'default' }
}

export function useCardTable() {
  const deepLink = roomFromSearch()
  const shell = useGameShell({ initialScreen: deepLink ? 'friends' : 'home' })
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [activeGame, setActiveGame] = useState<GameId>(initialActiveGame)
  const [statsGame, setStatsGame] = useState<AvailableGameId>('hearts')
  const [statsFocus, setStatsFocus] = useState<'default' | 'daily-challenges'>('default')
  const [homeEpoch, setHomeEpoch] = useState(0)
  const [friendsGameId, setFriendsGameId] = useState<GameId | null>(deepLink?.gameId ?? null)
  const [friendsRoomCode, setFriendsRoomCode] = useState<string | null>(deepLink?.code ?? null)

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

  const playFriends = useCallback(
    (gameId: GameId) => {
      clearRoomSearch()
      setFriendsGameId(gameId)
      setFriendsRoomCode(null)
      shell.setScreen('friends')
    },
    [shell],
  )

  const joinFriends = useCallback(
    (code: string, gameId: GameId = 'hearts') => {
      const next = normalizeRoomCode(code)
      if (next.length !== 4) return
      setFriendsGameId(gameId)
      setFriendsRoomCode(next)
      shell.setScreen('friends')
    },
    [shell],
  )

  const setFriendsGame = useCallback((gameId: GameId) => {
    setFriendsGameId(gameId)
  }, [])

  const openStats = useCallback(
    (arg?: StatsOpenArg) => {
      const { gameId, focus } = resolveStatsOpen(arg)
      if (gameId) setStatsGame(gameId)
      setStatsFocus(focus)
      shell.setScreen('stats')
    },
    [shell],
  )

  const closeStats = useCallback(() => {
    setStatsFocus('default')
    shell.setScreen('home')
  }, [shell])

  const bumpHome = useCallback(() => setHomeEpoch((e) => e + 1), [])

  const leaveFriends = useCallback(() => {
    clearRoomSearch()
    setFriendsGameId(null)
    setFriendsRoomCode(null)
    shell.setScreen('home')
    bumpHome()
  }, [shell, bumpHome])

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
    setSkipRecaps: (skipRecaps: boolean) => patchPrefs({ skipRecaps }),
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
    statsFocus,
    screen: shell.screen,
    setScreen: shell.setScreen,
    openStats,
    closeStats,
    openSettings: shell.openSettings,
    closeSettings: shell.closeSettings,
    homeEpoch,
    prefs,
    saves,
    playGame,
    continueGame,
    playFriends,
    joinFriends,
    setFriendsGame,
    leaveFriends,
    friendsGameId,
    friendsRoomCode,
    friendsName: prefs.seats[0].name.trim() || DEFAULT_NAMES[0],
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
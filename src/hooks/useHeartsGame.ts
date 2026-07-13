import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import {
  type Achievement,
  checkHandAchievements,
  checkMatchAchievements,
  handInputFromState,
} from '../achievements'
import {
  HeartsState,
  acceptReceived,
  advanceAfterTrick,
  applyIdentityFromPrefs,
  clearWarning,
  confirmPass,
  createInitialState,
  getLegalForHuman,
  nextHand,
  runAiTurn,
  runAutoTurn,
  setDifficulty,
  setPlayerCharacter,
  setPlayerName,
  setRules,
  showMatchResults,
  startNewGame,
  togglePassCard,
  tryPlayCard,
} from '../games/hearts/engine'
import type { HeartsRulesConfig } from '../games/hearts/types'
import {
  AUTO_FINISH_TIMING,
  CardBackStyle,
  FeltStyle,
  GameSpeed,
  UserPrefs,
  SPEED_TIMING,
  loadPrefs,
  savePrefs,
} from '../prefs'
import { clearGame, loadGame, saveGame } from '../gameSave'
import { recordGoalEvent } from '../goals'
import { recordHandEnd, recordMatchEnd } from '../stats'

export function useHeartsGame() {
  const [prefs, setPrefs] = useState<UserPrefs>(() => loadPrefs())
  const saved = useRef(loadGame())
  const [state, setState] = useState<HeartsState>(() => {
    const p = loadPrefs()
    // Apply current prefs (names / avatars) over any saved match
    if (saved.current?.state) {
      return applyIdentityFromPrefs(saved.current.state, p.seats)
    }
    return createInitialState(p)
  })
  const [screen, setScreen] = useState<'home' | 'table' | 'settings' | 'stats'>(() =>
    saved.current?.state ? 'table' : 'home',
  )
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null)
  const achievementQueue = useRef<Achievement[]>([])
  const matchTrack = useRef({
    zeroHands: 0,
    queenFreeHands: 0,
    moonsByHuman: 0,
    hadOpponentMoon: false,
    hands: 0,
    maxDeficit: 0,
  })
  const [hasSave, setHasSave] = useState(() => saved.current != null)
  const timerRef = useRef<number | null>(null)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => () => clearTimer(), [])

  // Persist full prefs whenever they change
  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  // Auto-save in-progress match (survives refresh / step away)
  useEffect(() => {
    saveGame(state)
    setHasSave(
      state.phase === 'passing' ||
        state.phase === 'receiving' ||
        state.phase === 'playing' ||
        state.phase === 'trick_reveal' ||
        state.phase === 'hand_result',
    )
  }, [state])

  // AI / auto turns + trick reveal — timings fully driven by speed setting
  useEffect(() => {
    clearTimer()
    const p = prefsRef.current
    const racing = p.autoFinishHand && state.racingOut
    const timing = racing ? AUTO_FINISH_TIMING : SPEED_TIMING[p.gameSpeed]

    if (state.phase === 'trick_reveal') {
      timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, timing.trickRevealMs)
      return
    }

    if (state.phase === 'playing' && state.whoseTurn != null) {
      const seat = state.whoseTurn
      const player = state.players[seat]
      if (racing) {
        timerRef.current = window.setTimeout(() => {
          setState((s) => runAutoTurn(s))
        }, timing.aiMs)
      } else if (!player.isHuman) {
        // flightPad scales with speed (0 on Instant — UI queues visuals)
        timerRef.current = window.setTimeout(() => {
          setState((s) => runAiTurn(s))
        }, timing.aiMs + timing.flightPadMs)
      }
    }
  }, [
    state.phase,
    state.whoseTurn,
    state.currentTrick.length,
    state.completedTricks.length,
    state.racingOut,
    prefs.gameSpeed,
    prefs.autoFinishHand,
  ])

  useEffect(() => {
    if (!state.warning) return
    const t = window.setTimeout(() => setState((s) => clearWarning(s)), 2600)
    return () => window.clearTimeout(t)
  }, [state.warning])

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateSeat = useCallback(
    (seat: Seat, patch: Partial<UserPrefs['seats'][Seat]>) => {
      setPrefs((prev) => {
        const next = {
          ...prev,
          seats: {
            ...prev.seats,
            [seat]: { ...prev.seats[seat], ...patch },
          },
        }
        setState((s) => applyIdentityFromPrefs(s, next.seats))
        return next
      })
    },
    [],
  )

  const setGameSpeed = useCallback(
    (gameSpeed: GameSpeed) => updatePrefs({ gameSpeed }),
    [updatePrefs],
  )

  const setAutoFinishHand = useCallback(
    (autoFinishHand: boolean) => updatePrefs({ autoFinishHand }),
    [updatePrefs],
  )

  const setFeltStyle = useCallback(
    (feltStyle: FeltStyle) => updatePrefs({ feltStyle }),
    [updatePrefs],
  )

  const setHapticsEnabled = useCallback(
    (hapticsEnabled: boolean) => updatePrefs({ hapticsEnabled }),
    [updatePrefs],
  )

  const setHumorMode = useCallback(
    (humorMode: boolean) => updatePrefs({ humorMode }),
    [updatePrefs],
  )

  const setCardBack = useCallback(
    (cardBack: CardBackStyle) => updatePrefs({ cardBack }),
    [updatePrefs],
  )

  const queueAchievements = useCallback((items: Achievement[]) => {
    if (!items.length) return
    achievementQueue.current.push(...items)
    setAchievementToast((current) => {
      if (current) return current
      const next = achievementQueue.current.shift() ?? null
      return next
    })
  }, [])

  const dismissAchievementToast = useCallback(() => {
    const next = achievementQueue.current.shift() ?? null
    setAchievementToast(next)
  }, [])

  // Career stats + achievements on hand / match end
  const statsPhase = useRef(state.phase)
  useEffect(() => {
    const prev = statsPhase.current
    statsPhase.current = state.phase
    if (prev === state.phase) return

    if (state.phase === 'hand_result') {
      const human = state.players[0]
      const handPts = state.handScores?.[0] ?? human.handPoints
      const mt = matchTrack.current
      mt.hands += 1
      if (handPts === 0) mt.zeroHands += 1
      if (!human.hasQueen) mt.queenFreeHands += 1
      if (state.moonShooter === 0) mt.moonsByHuman += 1
      if (state.moonShooter != null && state.moonShooter !== 0) mt.hadOpponentMoon = true
      const leader = Math.min(...([0, 1, 2, 3] as const).map((s) => state.players[s].totalScore))
      const deficit = human.totalScore - leader
      if (deficit > mt.maxDeficit) mt.maxDeficit = deficit

      const stats = recordHandEnd({
        humanPoints: handPts,
        humanTookQueen: human.hasQueen,
        moonShooter: state.moonShooter,
      })
      recordGoalEvent({ metric: 'hands_played' })
      if (handPts === 0) recordGoalEvent({ metric: 'clean_hands' })
      if (!human.hasQueen) recordGoalEvent({ metric: 'queen_free_hands' })
      if (handPts > 0 && handPts <= 5) recordGoalEvent({ metric: 'hands_under_five' })
      if (state.moonShooter === 0) recordGoalEvent({ metric: 'moons_shot' })

      const unlocked = checkHandAchievements(
        handInputFromState(
          state,
          mt.zeroHands,
          mt.queenFreeHands,
          mt.hadOpponentMoon,
          mt.maxDeficit,
        ),
        stats,
      )
      queueAchievements(unlocked)
    }
    if (state.phase === 'game_over' && state.winner != null) {
      const mt = matchTrack.current
      const humanScore = state.players[0].totalScore
      const winnerScore = state.players[state.winner].totalScore
      const stats = recordMatchEnd({
        humanWon: state.winner === 0,
        humanScore,
        winnerScore,
        handsInMatch: mt.hands,
        moonsInMatch: mt.moonsByHuman,
        cleanHandsInMatch: mt.zeroHands,
      })
      recordGoalEvent({ metric: 'matches_played' })
      if (state.winner === 0) recordGoalEvent({ metric: 'matches_won' })

      const unlocked = checkMatchAchievements(
        {
          humanWon: state.winner === 0,
          humanScore,
          zeroHandsThisMatch: mt.zeroHands,
          queenFreeHandsThisMatch: mt.queenFreeHands,
          moonsByHumanThisMatch: mt.moonsByHuman,
          matchHadOpponentMoon: mt.hadOpponentMoon,
          handsInMatch: mt.hands,
          maxDeficitThisMatch: mt.maxDeficit,
        },
        stats,
      )
      queueAchievements(unlocked)
      matchTrack.current = {
        zeroHands: 0,
        queenFreeHands: 0,
        moonsByHuman: 0,
        hadOpponentMoon: false,
        hands: 0,
        maxDeficit: 0,
      }
    }
  }, [state.phase, state.players, state.handScores, state.moonShooter, state.winner, queueAchievements])

  const play = useCallback(() => {
    clearGame()
    matchTrack.current = {
      zeroHands: 0,
      queenFreeHands: 0,
      moonsByHuman: 0,
      hadOpponentMoon: false,
      hands: 0,
      maxDeficit: 0,
    }
    setState(() => startNewGame(createInitialState(prefsRef.current), prefsRef.current))
    setScreen('table')
    setHasSave(true)
  }, [])

  const continueGame = useCallback(() => {
    const g = loadGame()
    if (g?.state) {
      setState(applyIdentityFromPrefs(g.state, prefsRef.current.seats))
      setScreen('table')
      setHasSave(true)
    }
  }, [])

  const quitToHome = useCallback(() => {
    // Keep save so they can continue later
    setScreen('home')
  }, [])

  const abandonGame = useCallback(() => {
    clearTimer()
    clearGame()
    setState(() => createInitialState(prefsRef.current))
    setScreen('home')
    setHasSave(false)
  }, [])

  const startOver = useCallback(() => {
    clearTimer()
    clearGame()
    matchTrack.current = {
      zeroHands: 0,
      queenFreeHands: 0,
      moonsByHuman: 0,
      hadOpponentMoon: false,
      hands: 0,
      maxDeficit: 0,
    }
    setState(() => startNewGame(createInitialState(prefsRef.current), prefsRef.current))
    setScreen('table')
    setHasSave(true)
  }, [])

  const onCardClick = useCallback((card: Card) => {
    setState((s) => {
      if (s.racingOut && prefsRef.current.autoFinishHand) return s
      if (s.phase === 'passing') return togglePassCard(s, card)
      if (s.phase === 'playing' && s.whoseTurn === 0) {
        return tryPlayCard(s, 0, card)
      }
      return s
    })
  }, [])

  const onConfirmPass = useCallback(() => {
    setState((s) => confirmPass(s))
  }, [])

  const onAcceptReceived = useCallback(() => {
    setState((s) => acceptReceived(s))
  }, [])

  const onNextHand = useCallback(() => {
    setState((s) => nextHand(s))
  }, [])

  const onShowMatchResults = useCallback(() => {
    setState((s) => showMatchResults(s))
  }, [])

  const onNewGame = useCallback(() => {
    clearGame()
    matchTrack.current = {
      zeroHands: 0,
      queenFreeHands: 0,
      moonsByHuman: 0,
      hadOpponentMoon: false,
      hands: 0,
      maxDeficit: 0,
    }
    setState(() => startNewGame(createInitialState(prefsRef.current), prefsRef.current))
    setScreen('table')
    setHasSave(true)
  }, [])

  const onUpdateDifficulty = useCallback(
    (seat: Seat, d: AiDifficulty) => {
      updateSeat(seat, { difficulty: d })
      setState((s) => setDifficulty(s, seat, d))
    },
    [updateSeat],
  )

  const onUpdateName = useCallback(
    (seat: Seat, name: string) => {
      updateSeat(seat, { name })
      setState((s) => setPlayerName(s, seat, name))
    },
    [updateSeat],
  )

  const onUpdateCharacter = useCallback(
    (seat: Seat, characterId: string) => {
      updateSeat(seat, { characterId })
      setState((s) => setPlayerCharacter(s, seat, characterId))
    },
    [updateSeat],
  )

  const onUpdateRules = useCallback((rules: Partial<HeartsRulesConfig>) => {
    setPrefs((prev) => ({
      ...prev,
      rules: { ...prev.rules, ...rules },
    }))
    setState((s) => setRules(s, rules))
  }, [])

  const legal = getLegalForHuman(state)

  return {
    state,
    screen,
    setScreen,
    prefs,
    hasSave,
    setGameSpeed,
    setAutoFinishHand,
    setFeltStyle,
    setHapticsEnabled,
    setHumorMode,
    setCardBack,
    legal,
    play,
    continueGame,
    quitToHome,
    abandonGame,
    startOver,
    onCardClick,
    onConfirmPass,
    onAcceptReceived,
    onNextHand,
    onShowMatchResults,
    onNewGame,
    achievementToast,
    dismissAchievementToast,
    onUpdateDifficulty,
    onUpdateName,
    onUpdateCharacter,
    onUpdateRules,
  }
}

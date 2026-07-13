import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import {
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
} from '../prefs'
import { clearGame, loadGame, saveGame } from '../gameSave'
import { recordGoalEvent } from '../goals'
import { recordHandEnd, recordMatchEnd } from '../stats'
import type { GameShell } from './useGameShell'

interface Options {
  shell: GameShell
  prefs: UserPrefs
  setPrefs: React.Dispatch<React.SetStateAction<UserPrefs>>
  paused?: boolean
}

export function useHeartsGame({ shell, prefs, setPrefs, paused = false }: Options) {
  const saved = useRef(loadGame('hearts'))
  const [state, setState] = useState<HeartsState>(() => {
    const p = prefs
    if (saved.current?.state && saved.current.gameId === 'hearts') {
      return applyIdentityFromPrefs(saved.current.state as HeartsState, p.seats)
    }
    return createInitialState(p)
  })
  const [hasSave, setHasSave] = useState(() => saved.current?.gameId === 'hearts')
  const matchTrack = useRef({
    zeroHands: 0,
    queenFreeHands: 0,
    moonsByHuman: 0,
    hadOpponentMoon: false,
    hands: 0,
    maxDeficit: 0,
  })
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    if (paused) return
    saveGame(state, 'hearts')
    setHasSave(
      state.phase === 'passing' ||
        state.phase === 'receiving' ||
        state.phase === 'playing' ||
        state.phase === 'trick_reveal' ||
        state.phase === 'hand_result',
    )
  }, [state, paused])

  useEffect(() => {
    if (paused) return
    shell.clearTimer()
    const p = prefsRef.current
    const racing = p.autoFinishHand && state.racingOut
    const timing = racing ? AUTO_FINISH_TIMING : SPEED_TIMING[p.gameSpeed]

    if (state.phase === 'trick_reveal') {
      shell.timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, timing.trickRevealMs)
      return
    }

    if (state.phase === 'playing' && state.whoseTurn != null) {
      const seat = state.whoseTurn
      const player = state.players[seat]
      if (racing) {
        shell.timerRef.current = window.setTimeout(() => {
          setState((s) => runAutoTurn(s))
        }, timing.aiMs)
      } else if (!player.isHuman) {
        shell.timerRef.current = window.setTimeout(() => {
          setState((s) => runAiTurn(s))
        }, timing.aiMs + timing.flightPadMs)
      }
    }
  }, [
    paused,
    state.phase,
    state.whoseTurn,
    state.currentTrick.length,
    state.completedTricks.length,
    state.racingOut,
    prefs.gameSpeed,
    prefs.autoFinishHand,
    shell,
  ])

  useEffect(() => {
    if (paused || !state.warning) return
    const t = window.setTimeout(() => setState((s) => clearWarning(s)), 2600)
    return () => window.clearTimeout(t)
  }, [state.warning, paused])

  const statsPhase = useRef(state.phase)
  useEffect(() => {
    if (paused) return
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
      shell.queueUnlocks(unlocked)
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
      shell.queueUnlocks(unlocked)
      matchTrack.current = {
        zeroHands: 0,
        queenFreeHands: 0,
        moonsByHuman: 0,
        hadOpponentMoon: false,
        hands: 0,
        maxDeficit: 0,
      }
    }
  }, [state.phase, state.players, state.handScores, state.moonShooter, state.winner, paused, shell])

  const updateSeat = useCallback(
    (seat: Seat, patch: Partial<UserPrefs['seats'][Seat]>) => {
      setPrefs((prev) => {
        const next = {
          ...prev,
          seats: { ...prev.seats, [seat]: { ...prev.seats[seat], ...patch } },
        }
        setState((s) => applyIdentityFromPrefs(s, next.seats))
        return next
      })
    },
    [setPrefs],
  )

  const resetMatchTrack = () => {
    matchTrack.current = {
      zeroHands: 0,
      queenFreeHands: 0,
      moonsByHuman: 0,
      hadOpponentMoon: false,
      hands: 0,
      maxDeficit: 0,
    }
  }

  const play = useCallback(() => {
    clearGame('hearts')
    resetMatchTrack()
    setState(() => startNewGame(createInitialState(prefsRef.current), prefsRef.current))
    setHasSave(true)
  }, [])

  const continueGame = useCallback(() => {
    const g = loadGame('hearts')
    if (g?.state && g.gameId === 'hearts') {
      setState(applyIdentityFromPrefs(g.state as HeartsState, prefsRef.current.seats))
      setHasSave(true)
      return true
    }
    return false
  }, [])

  const abandonGame = useCallback(() => {
    shell.clearTimer()
    clearGame('hearts')
    setState(() => createInitialState(prefsRef.current))
    setHasSave(false)
  }, [shell])

  const startOver = useCallback(() => {
    shell.clearTimer()
    clearGame('hearts')
    resetMatchTrack()
    setState(() => startNewGame(createInitialState(prefsRef.current), prefsRef.current))
    setHasSave(true)
  }, [shell])

  const onCardClick = useCallback((card: Card) => {
    setState((s) => {
      if (s.racingOut && prefsRef.current.autoFinishHand) return s
      if (s.phase === 'passing') return togglePassCard(s, card)
      if (s.phase === 'playing' && s.whoseTurn === 0) return tryPlayCard(s, 0, card)
      return s
    })
  }, [])

  const onConfirmPass = useCallback(() => setState((s) => confirmPass(s)), [])
  const onAcceptReceived = useCallback(() => setState((s) => acceptReceived(s)), [])
  const onNextHand = useCallback(() => setState((s) => nextHand(s)), [])
  const onShowMatchResults = useCallback(() => setState((s) => showMatchResults(s)), [])

  const onNewGame = useCallback(() => {
    clearGame('hearts')
    resetMatchTrack()
    setState(() => startNewGame(createInitialState(prefsRef.current), prefsRef.current))
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
    setPrefs((prev) => ({ ...prev, rules: { ...prev.rules, ...rules } }))
    setState((s) => setRules(s, rules))
  }, [setPrefs])

  const setGameSpeed = useCallback(
    (gameSpeed: GameSpeed) => setPrefs((p) => ({ ...p, gameSpeed })),
    [setPrefs],
  )
  const setAutoFinishHand = useCallback(
    (autoFinishHand: boolean) => setPrefs((p) => ({ ...p, autoFinishHand })),
    [setPrefs],
  )
  const setFeltStyle = useCallback(
    (feltStyle: FeltStyle) => setPrefs((p) => ({ ...p, feltStyle })),
    [setPrefs],
  )
  const setHapticsEnabled = useCallback(
    (hapticsEnabled: boolean) => setPrefs((p) => ({ ...p, hapticsEnabled })),
    [setPrefs],
  )
  const setHumorMode = useCallback(
    (humorMode: boolean) => setPrefs((p) => ({ ...p, humorMode })),
    [setPrefs],
  )
  const setCardBack = useCallback(
    (cardBack: CardBackStyle) => setPrefs((p) => ({ ...p, cardBack })),
    [setPrefs],
  )

  return {
    state,
    hasSave,
    legal: getLegalForHuman(state),
    play,
    continueGame,
    abandonGame,
    startOver,
    onCardClick,
    onConfirmPass,
    onAcceptReceived,
    onNextHand,
    onShowMatchResults,
    onNewGame,
    onUpdateDifficulty,
    onUpdateName,
    onUpdateCharacter,
    onUpdateRules,
    setGameSpeed,
    setAutoFinishHand,
    setFeltStyle,
    setHapticsEnabled,
    setHumorMode,
    setCardBack,
  }
}
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import {
  checkHandAchievements,
  checkMatchAchievements,
  handInputFromState,
} from '../achievements'
import {
  HeartsState,
  ackPassComplete,
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
import {
  defaultHeartsMatchTrack,
  type HeartsMatchTrack,
} from '../matchTrack'
import { recordGoalEvent } from '../goals'
import { applyHumanSeats, humanWonHearts, primaryHumanSeat, uiSeat } from '../passAndPlay'
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
  const matchTrack = useRef<HeartsMatchTrack>(
    (() => {
      const t = saved.current?.matchTrack
      if (t && saved.current?.gameId === 'hearts' && 'zeroHands' in t) {
        return t as HeartsMatchTrack
      }
      return defaultHeartsMatchTrack()
    })(),
  )
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    if (paused) return
    setState((s) => applyHumanSeats(s, prefs))
  }, [prefs.passAndPlay, prefs.humanSeats, paused])

  useEffect(() => {
    if (paused) return
    const p = prefsRef.current
    saveGame(state, 'hearts', matchTrack.current, {
      passAndPlay: p.passAndPlay,
      humanSeats: p.humanSeats,
    })
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
      const finalTrick = state.players[0].hand.length === 0
      const revealMs = finalTrick
        ? Math.max(timing.trickRevealMs, timing.holdMs + 380)
        : timing.trickRevealMs
      shell.timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, revealMs)
      return
    }

    if (state.awaitingPassAck) return

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
    state.awaitingPassAck,
    state.whoseTurn,
    state.currentTrick?.length ?? 0,
    state.completedTricks?.length ?? 0,
    state.players[0].hand.length,
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
      const you = primaryHumanSeat(prefsRef.current)
      const human = state.players[you]
      const handPts = state.handScores?.[you] ?? human.handPoints
      const mt = matchTrack.current
      mt.hands += 1
      if (handPts === 0) mt.zeroHands += 1
      if (!human.hasQueen) mt.queenFreeHands += 1
      if (state.moonShooter === you) mt.moonsByHuman += 1
      if (state.moonShooter != null && state.moonShooter !== you) mt.hadOpponentMoon = true
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
      if (state.moonShooter === you) recordGoalEvent({ metric: 'moons_shot' })

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
      const you = primaryHumanSeat(prefsRef.current)
      const humanScore = state.players[you].totalScore
      const winnerScore = state.players[state.winner].totalScore
      const won = humanWonHearts(state.winner, prefsRef.current)
      const stats = recordMatchEnd({
        humanWon: won,
        humanScore,
        winnerScore,
        handsInMatch: mt.hands,
        moonsInMatch: mt.moonsByHuman,
        cleanHandsInMatch: mt.zeroHands,
      })
      recordGoalEvent({ metric: 'matches_played' })
      if (won) recordGoalEvent({ metric: 'matches_won' })

      const unlocked = checkMatchAchievements(
        {
          humanWon: won,
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
      if (g.passPlay) {
        setPrefs((p) => ({
          ...p,
          passAndPlay: g.passPlay!.passAndPlay,
          humanSeats: g.passPlay!.humanSeats,
        }))
      }
      setState(applyIdentityFromPrefs(g.state as HeartsState, prefsRef.current.seats))
      const t = g.matchTrack
      matchTrack.current =
        t && 'zeroHands' in t ? (t as HeartsMatchTrack) : defaultHeartsMatchTrack()
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
      const seat = uiSeat(s, prefsRef.current)
      if (s.phase === 'playing' && s.whoseTurn === seat) return tryPlayCard(s, seat, card)
      return s
    })
  }, [])

  const onConfirmPass = useCallback(() => setState((s) => confirmPass(s)), [])
  const onAcceptReceived = useCallback(() => setState((s) => acceptReceived(s)), [])
  const onAckPassComplete = useCallback(() => setState((s) => ackPassComplete(s)), [])
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
  const setSoundEnabled = useCallback(
    (soundEnabled: boolean) => setPrefs((p) => ({ ...p, soundEnabled })),
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
  const setPassAndPlay = useCallback(
    (passAndPlay: boolean) => setPrefs((p) => ({ ...p, passAndPlay })),
    [setPrefs],
  )
  const setHumanSeat = useCallback(
    (seat: Seat, human: boolean) => {
      if (seat === 0) return
      setPrefs((p) => ({
        ...p,
        humanSeats: { ...p.humanSeats, [seat]: human },
      }))
    },
    [setPrefs],
  )

  return {
    state,
    hasSave,
    legal: getLegalForHuman(state, uiSeat(state, prefs)),
    play,
    continueGame,
    abandonGame,
    startOver,
    onCardClick,
    onConfirmPass,
    onAcceptReceived,
    onAckPassComplete,
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
    setSoundEnabled,
    setHumorMode,
    setCardBack,
    setPassAndPlay,
    setHumanSeat,
  }
}
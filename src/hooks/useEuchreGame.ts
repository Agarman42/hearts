import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import type { Suit } from '../core/types'
import {
  EuchreState,
  advanceAfterTrick,
  clearWarning,
  createInitialState,
  discardCard,
  getLegalForHuman,
  goAlone,
  nameTrump,
  nextHand,
  orderUp,
  passBid,
  runAiTurn,
  withPartner,
  showMatchResults,
  startNewGame,
  tryPlayCard,
  setDifficulty,
  setPlayerCharacter,
  setPlayerName,
  setEuchreRules,
} from '../games/euchre/engine'
import {
  CardBackStyle,
  FeltStyle,
  GameSpeed,
  UserPrefs,
  SPEED_TIMING,
} from '../prefs'
import {
  checkEuchreHandAchievements,
  checkEuchreMatchAchievements,
  euchreHandInputFromState,
} from '../achievements/euchre'
import { recordGoalEvent } from '../goals'
import { clearGame, loadGame, saveGame } from '../gameSave'
import { recordEuchreHandEnd, recordMatchEnd } from '../stats'
import type { EuchreRulesConfig } from '../games/euchre/types'
import type { GameShell } from './useGameShell'

interface Options {
  shell: GameShell
  prefs: UserPrefs
  setPrefs: React.Dispatch<React.SetStateAction<UserPrefs>>
  paused?: boolean
}

export function useEuchreGame({ shell, prefs, setPrefs, paused = false }: Options) {
  const saved = useRef(loadGame('euchre'))
  const [state, setState] = useState<EuchreState>(() => {
    if (saved.current?.state && saved.current.gameId === 'euchre') {
      return saved.current.state as EuchreState
    }
    return createInitialState({ seats: prefs.seats, euchreRules: prefs.euchreRules })
  })
  const [hasSave, setHasSave] = useState(() => saved.current?.gameId === 'euchre')
  const matchTrack = useRef({ hands: 0 })
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const statsPhase = useRef(state.phase)

  useEffect(() => {
    if (paused) return
    saveGame(state, 'euchre')
    setHasSave(
      state.phase === 'bidding' ||
        state.phase === 'discard' ||
        state.phase === 'loner_choice' ||
        state.phase === 'playing' ||
        state.phase === 'trick_reveal' ||
        state.phase === 'hand_result',
    )
  }, [state, paused])

  useEffect(() => {
    if (paused) return
    shell.clearTimer()
    const timing = SPEED_TIMING[prefsRef.current.gameSpeed]

    if (state.phase === 'trick_reveal') {
      const finalTrick = state.completedTricks.length >= 4
      const revealMs = finalTrick
        ? Math.max(timing.trickRevealMs, timing.holdMs + 500) + 900
        : timing.trickRevealMs
      shell.timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, revealMs)
      return
    }

    if (
      (state.phase === 'playing' ||
        state.phase === 'bidding' ||
        state.phase === 'discard' ||
        state.phase === 'loner_choice') &&
      state.whoseTurn != null
    ) {
      const seat = state.whoseTurn
      const player = state.players[seat]
      if (!player.isHuman) {
        shell.timerRef.current = window.setTimeout(() => {
          setState((s) => runAiTurn(s))
        }, Math.max(timing.aiMs + timing.flightPadMs, timing.flightMs + 80))
      }
    }
  }, [
    paused,
    state.phase,
    state.whoseTurn,
    state.currentTrick.length,
    state.biddingRound,
    state.passedThisRound.length,
    prefs.gameSpeed,
    shell,
  ])

  useEffect(() => {
    if (paused || !state.warning) return
    const t = window.setTimeout(() => setState((s) => clearWarning(s)), 2600)
    return () => window.clearTimeout(t)
  }, [state.warning, paused])

  useEffect(() => {
    if (paused) return
    const prev = statsPhase.current
    statsPhase.current = state.phase
    if (prev === state.phase) return

    if (state.phase === 'hand_result') {
      matchTrack.current.hands += 1
      const handInput = euchreHandInputFromState(state)
      const stats = recordEuchreHandEnd(handInput)
      recordGoalEvent({ metric: 'hands_played' }, 'euchre')
      if (handInput.humanOrdered && handInput.makerTricks >= 3) {
        recordGoalEvent({ metric: 'orders_made' }, 'euchre')
      }
      if (handInput.defendedEuchre) recordGoalEvent({ metric: 'euchres_made' }, 'euchre')
      if (handInput.marched && handInput.humanTeamMaker) {
        recordGoalEvent({ metric: 'marches_made' }, 'euchre')
      }
      if (handInput.loner && handInput.marched && handInput.humanOrdered) {
        recordGoalEvent({ metric: 'loners_made' }, 'euchre')
      }
      const unlocked = checkEuchreHandAchievements(handInput, stats)
      shell.queueUnlocks(unlocked)
    }
    if (state.phase === 'game_over' && state.winner != null) {
      const humanWon = state.winner === 'ns'
      const stats = recordMatchEnd(
        {
          humanWon,
          humanScore: state.teamScores.ns,
          winnerScore: humanWon ? state.teamScores.ns : state.teamScores.ew,
          handsInMatch: matchTrack.current.hands,
          moonsInMatch: 0,
          cleanHandsInMatch: 0,
        },
        'euchre',
      )
      recordGoalEvent({ metric: 'matches_played' }, 'euchre')
      if (humanWon) recordGoalEvent({ metric: 'matches_won' }, 'euchre')
      const unlocked = checkEuchreMatchAchievements(
        {
          humanWon,
          raceTo: state.rules.raceTo,
          handsInMatch: matchTrack.current.hands,
        },
        stats,
      )
      shell.queueUnlocks(unlocked)
      matchTrack.current = { hands: 0 }
    }
  }, [
    state.phase,
    state.winner,
    state.teamScores,
    state.handNumber,
    state.lastHandSummary,
    state.maker,
    state.makerTeam,
    state.loner,
    state.rules.raceTo,
    paused,
    shell,
  ])

  const updateSeat = useCallback(
    (seat: Seat, patch: Partial<UserPrefs['seats'][Seat]>) => {
      setPrefs((p) => ({
        ...p,
        seats: { ...p.seats, [seat]: { ...p.seats[seat], ...patch } },
      }))
    },
    [setPrefs],
  )

  const play = useCallback(() => {
    matchTrack.current = { hands: 0 }
    setState(() =>
      startNewGame(
        createInitialState({
          seats: prefsRef.current.seats,
          euchreRules: prefsRef.current.euchreRules,
        }),
      ),
    )
    setHasSave(true)
  }, [])

  const continueGame = useCallback(() => {
    const g = loadGame('euchre')
    if (g?.state && g.gameId === 'euchre') {
      setState(g.state as EuchreState)
      setHasSave(true)
      return true
    }
    return false
  }, [])

  const abandonGame = useCallback(() => {
    shell.clearTimer()
    clearGame('euchre')
    setState(() =>
      createInitialState({
        seats: prefsRef.current.seats,
        euchreRules: prefsRef.current.euchreRules,
      }),
    )
    setHasSave(false)
  }, [shell])

  const startOver = useCallback(() => {
    shell.clearTimer()
    matchTrack.current = { hands: 0 }
    clearGame('euchre')
    setState(() =>
      startNewGame(
        createInitialState({
          seats: prefsRef.current.seats,
          euchreRules: prefsRef.current.euchreRules,
        }),
      ),
    )
    setHasSave(true)
  }, [shell])

  const onCardClick = useCallback((card: Card) => {
    setState((s) => {
      if (s.phase === 'discard' && s.whoseTurn === 0) return discardCard(s, 0, card)
      if (s.phase === 'playing' && s.whoseTurn === 0) return tryPlayCard(s, 0, card)
      return s
    })
  }, [])

  const onPass = useCallback(() => setState((s) => passBid(s, 0)), [])
  const onOrderUp = useCallback(() => setState((s) => orderUp(s, 0)), [])
  const onNameTrump = useCallback(
    (suit: Suit) => setState((s) => nameTrump(s, 0, suit)),
    [],
  )
  const onGoAlone = useCallback(() => setState((s) => goAlone(s, 0)), [])
  const onWithPartner = useCallback(() => setState((s) => withPartner(s, 0)), [])

  const onNextHand = useCallback(() => setState((s) => nextHand(s)), [])
  const onShowMatchResults = useCallback(() => setState((s) => showMatchResults(s)), [])

  const onNewGame = useCallback(() => {
    clearGame('euchre')
    setState(() =>
      startNewGame(
        createInitialState({
          seats: prefsRef.current.seats,
          euchreRules: prefsRef.current.euchreRules,
        }),
      ),
    )
    setHasSave(true)
  }, [])

  const onUpdateEuchreRules = useCallback(
    (rules: Partial<EuchreRulesConfig>) => {
      setPrefs((prev) => ({ ...prev, euchreRules: { ...prev.euchreRules, ...rules } }))
      setState((s) => setEuchreRules(s, rules))
    },
    [setPrefs],
  )

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

  const setGameSpeed = useCallback(
    (gameSpeed: GameSpeed) => setPrefs((p) => ({ ...p, gameSpeed })),
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
    onPass,
    onOrderUp,
    onNameTrump,
    onGoAlone,
    onWithPartner,
    onUpdateEuchreRules,
    onNextHand,
    onShowMatchResults,
    onNewGame,
    onUpdateDifficulty,
    onUpdateName,
    onUpdateCharacter,
    setGameSpeed,
    setFeltStyle,
    setHapticsEnabled,
    setHumorMode,
    setCardBack,
  }
}
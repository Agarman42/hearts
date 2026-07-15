import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import type { Suit } from '../core/types'
import {
  EuchreState,
  ackDiscardComplete,
  ackLonerChoice,
  ackTrumpCall,
  advanceAfterTrick,
  clearWarning,
  createInitialState,
  discardCard,
  getLegalForHuman,
  goAlone,
  nameTrump,
  nextHand,
  hydrateEuchreFromPrefs,
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
import {
  defaultEuchreMatchTrack,
  type EuchreMatchTrack,
} from '../matchTrack'
import {
  applyHumanSeats,
  humanPartnershipTeam,
  humanTeamWon,
  uiSeat,
} from '../passAndPlay'
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
      return hydrateEuchreFromPrefs(saved.current.state as EuchreState, prefs)
    }
    return createInitialState({ seats: prefs.seats, euchreRules: prefs.euchreRules })
  })
  const [hasSave, setHasSave] = useState(() => saved.current?.gameId === 'euchre')
  const matchTrack = useRef<EuchreMatchTrack>(
    (() => {
      const t = saved.current?.matchTrack
      if (t && saved.current?.gameId === 'euchre') {
        return { hands: typeof t.hands === 'number' ? t.hands : 0 }
      }
      return defaultEuchreMatchTrack()
    })(),
  )
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const statsPhase = useRef(state.phase)

  useEffect(() => {
    if (paused) return
    setState((s) => applyHumanSeats(s, prefs))
  }, [prefs, paused])

  useEffect(() => {
    if (paused) return
    const p = prefsRef.current
    saveGame(state, 'euchre', matchTrack.current, {
      passAndPlay: p.passAndPlay,
      humanSeats: p.humanSeats,
    })
    setHasSave(
      state.phase === 'bidding' ||
        state.phase === 'discard' ||
        state.phase === 'loner_choice' ||
        state.phase === 'playing' ||
        state.phase === 'trick_reveal' ||
        state.phase === 'hand_result',
    )
  }, [state, paused])

  const currentTrickLen = state.currentTrick?.length ?? 0
  const completedTrickLen = state.completedTricks.length
  const biddingRound = state.biddingRound
  const passedRoundLen = state.passedThisRound?.length ?? 0

  useEffect(() => {
    if (paused) return
    shell.clearTimer()
    const timing = SPEED_TIMING[prefsRef.current.gameSpeed]

    if (state.phase === 'trick_reveal') {
      const finalTrick = completedTrickLen >= 5
      const revealMs = finalTrick
        ? Math.max(timing.trickRevealMs, timing.holdMs + 380)
        : timing.trickRevealMs
      shell.timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, revealMs)
      return
    }

    if (state.awaitingTrumpAck || state.awaitingLonerAck || state.awaitingDiscardAck) return

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
        const biddingPad = state.phase === 'bidding' ? 1500 : 0
        shell.timerRef.current = window.setTimeout(() => {
          setState((s) => runAiTurn(s))
        }, Math.max(timing.aiMs + timing.flightPadMs + biddingPad, timing.flightMs + 80))
      }
    }
  }, [
    paused,
    state.phase,
    state.whoseTurn,
    state.awaitingTrumpAck,
    state.awaitingLonerAck,
    state.awaitingDiscardAck,
    currentTrickLen,
    biddingRound,
    passedRoundLen,
    completedTrickLen,
    state.players,
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
      const handInput = euchreHandInputFromState(state, prefsRef.current)
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
      const yourTeam = humanPartnershipTeam(prefsRef.current)
      const humanWon = humanTeamWon(state.winner, prefsRef.current)
      const stats = recordMatchEnd(
        {
          humanWon,
          humanScore: state.teamScores[yourTeam],
          winnerScore: state.teamScores[state.winner],
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
  }, [state, paused, shell])

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
    clearGame('euchre')
    matchTrack.current = defaultEuchreMatchTrack()
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
      if (g.passPlay) {
        setPrefs((p) => ({
          ...p,
          passAndPlay: g.passPlay!.passAndPlay,
          humanSeats: g.passPlay!.humanSeats,
        }))
      }
      setState(hydrateEuchreFromPrefs(g.state as EuchreState, prefsRef.current))
      const t = g.matchTrack
      matchTrack.current =
        t && typeof t.hands === 'number'
          ? { hands: t.hands }
          : defaultEuchreMatchTrack()
      setHasSave(true)
      return true
    }
    return false
  }, [setPrefs])

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
      const seat = s.whoseTurn
      if (seat == null) return s
      if (s.phase === 'discard' && s.whoseTurn === seat) return discardCard(s, seat, card)
      if (s.phase === 'playing' && s.whoseTurn === seat) return tryPlayCard(s, seat, card)
      return s
    })
  }, [])

  const onPass = useCallback(() => setState((s) => (s.whoseTurn != null ? passBid(s, s.whoseTurn) : s)), [])
  const onOrderUp = useCallback(() => setState((s) => (s.whoseTurn != null ? orderUp(s, s.whoseTurn) : s)), [])
  const onNameTrump = useCallback(
    (suit: Suit) =>
      setState((s) => (s.whoseTurn != null ? nameTrump(s, s.whoseTurn, suit) : s)),
    [],
  )
  const onGoAlone = useCallback(() => setState((s) => (s.whoseTurn != null ? goAlone(s, s.whoseTurn) : s)), [])
  const onWithPartner = useCallback(() => setState((s) => (s.whoseTurn != null ? withPartner(s, s.whoseTurn) : s)), [])
  const onAckTrumpCall = useCallback(() => setState((s) => ackTrumpCall(s)), [])
  const onAckLonerChoice = useCallback(() => setState((s) => ackLonerChoice(s)), [])
  const onAckDiscardComplete = useCallback(() => setState((s) => ackDiscardComplete(s)), [])

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
    onPass,
    onOrderUp,
    onNameTrump,
    onGoAlone,
    onWithPartner,
    onAckTrumpCall,
    onAckLonerChoice,
    onAckDiscardComplete,
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
    setSoundEnabled,
    setHumorMode,
    setCardBack,
    setPassAndPlay,
    setHumanSeat,
  }
}
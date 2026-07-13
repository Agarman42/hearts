import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import {
  SpadesState,
  advanceAfterTrick,
  applyIdentityFromPrefs,
  clearWarning,
  createInitialState,
  getLegalForHuman,
  nextHand,
  runAiTurn,
  showMatchResults,
  startNewGame,
  submitBid,
  tryPlayCard,
  setDifficulty,
  setPlayerCharacter,
  setPlayerName,
  setSpadesRules,
} from '../games/spades/engine'
import {
  CardBackStyle,
  FeltStyle,
  GameSpeed,
  UserPrefs,
  SPEED_TIMING,
} from '../prefs'
import { clearGame, loadGame, saveGame } from '../gameSave'
import {
  checkSpadesHandAchievements,
  checkSpadesMatchAchievements,
  spadesHandInputFromState,
} from '../achievements/spades'
import { recordGoalEvent } from '../goals'
import { recordHandEnd, recordMatchEnd } from '../stats'
import type { BidChoice } from '../components/SpadesBidPanel'
import type { SpadesRulesConfig } from '../games/spades/types'
import type { GameShell } from './useGameShell'

interface Options {
  shell: GameShell
  prefs: UserPrefs
  setPrefs: React.Dispatch<React.SetStateAction<UserPrefs>>
  paused?: boolean
}

export function useSpadesGame({ shell, prefs, setPrefs, paused = false }: Options) {
  const saved = useRef(loadGame('spades'))
  const [state, setState] = useState<SpadesState>(() => {
    if (saved.current?.state && saved.current.gameId === 'spades') {
      return applyIdentityFromPrefs(saved.current.state as SpadesState, prefs.seats)
    }
    return createInitialState({ seats: prefs.seats, spadesRules: prefs.spadesRules })
  })
  const [hasSave, setHasSave] = useState(() => saved.current?.gameId === 'spades')
  const matchTrack = useRef({ hands: 0, hadBagPenalty: false, prevNsScore: 0 })
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    if (paused) return
    saveGame(state, 'spades')
    setHasSave(
      state.phase === 'bidding' ||
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
      shell.timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, timing.trickRevealMs)
      return
    }

    if (
      (state.phase === 'playing' || state.phase === 'bidding') &&
      state.whoseTurn != null
    ) {
      const seat = state.whoseTurn
      const player = state.players[seat]
      if (!player.isHuman) {
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
    prefs.gameSpeed,
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

    if (state.phase === 'bidding' && prev !== 'bidding') {
      matchTrack.current.prevNsScore = state.teamScores.ns
    }
    if (state.phase === 'hand_result') {
      const mt = matchTrack.current
      mt.hands += 1
      const handPts = state.handScores?.ns ?? 0
      if (state.teamScores.ns < mt.prevNsScore + handPts) mt.hadBagPenalty = true
      mt.prevNsScore = state.teamScores.ns

      const stats = recordHandEnd(
        { humanPoints: 0, humanTookQueen: false, moonShooter: null },
        'spades',
      )
      recordGoalEvent({ metric: 'hands_played' }, 'spades')
      const handInput = spadesHandInputFromState(state)
      if (handInput.teamMadeBid) recordGoalEvent({ metric: 'team_bid_made' }, 'spades')
      if (handInput.humanNil && handInput.humanTricks === 0) {
        recordGoalEvent({ metric: 'nil_made' }, 'spades')
        if (handInput.humanBlindNil) {
          recordGoalEvent({ metric: 'blind_nil_made' }, 'spades')
        }
      }
      const unlocked = checkSpadesHandAchievements(handInput, stats)
      shell.queueUnlocks(unlocked)
    }
    if (state.phase === 'game_over' && state.winner != null) {
      const mt = matchTrack.current
      const humanWon = state.winner === 'ns'
      const stats = recordMatchEnd(
        {
          humanWon,
          humanScore: state.teamScores.ns,
          winnerScore: humanWon ? state.teamScores.ns : state.teamScores.ew,
          handsInMatch: mt.hands,
          moonsInMatch: 0,
          cleanHandsInMatch: 0,
        },
        'spades',
      )
      recordGoalEvent({ metric: 'matches_played' }, 'spades')
      if (humanWon) recordGoalEvent({ metric: 'matches_won' }, 'spades')
      const unlocked = checkSpadesMatchAchievements(
        {
          humanWon,
          teamScore: state.teamScores.ns,
          raceTo: state.rules.raceTo,
          hadBagPenalty: mt.hadBagPenalty,
          handsInMatch: mt.hands,
        },
        stats,
      )
      shell.queueUnlocks(unlocked)
      matchTrack.current = { hands: 0, hadBagPenalty: false, prevNsScore: 0 }
    }
  }, [state.phase, state.winner, state.teamScores, state.handScores, state.rules.raceTo, paused, shell])

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

  const play = useCallback(() => {
    clearGame('spades')
    matchTrack.current = { hands: 0, hadBagPenalty: false, prevNsScore: 0 }
    setState(() =>
      startNewGame(
        createInitialState({
          seats: prefsRef.current.seats,
          spadesRules: prefsRef.current.spadesRules,
        }),
      ),
    )
    setHasSave(true)
  }, [])

  const continueGame = useCallback(() => {
    const g = loadGame('spades')
    if (g?.state && g.gameId === 'spades') {
      setState(applyIdentityFromPrefs(g.state as SpadesState, prefsRef.current.seats))
      setHasSave(true)
      return true
    }
    return false
  }, [])

  const abandonGame = useCallback(() => {
    shell.clearTimer()
    clearGame('spades')
    setState(() =>
      createInitialState({
        seats: prefsRef.current.seats,
        spadesRules: prefsRef.current.spadesRules,
      }),
    )
    setHasSave(false)
  }, [shell])

  const startOver = useCallback(() => {
    shell.clearTimer()
    clearGame('spades')
    matchTrack.current = { hands: 0, hadBagPenalty: false, prevNsScore: 0 }
    setState(() =>
      startNewGame(
        createInitialState({
          seats: prefsRef.current.seats,
          spadesRules: prefsRef.current.spadesRules,
        }),
      ),
    )
    setHasSave(true)
  }, [shell])

  const onCardClick = useCallback((card: Card) => {
    setState((s) => {
      if (s.phase === 'playing' && s.whoseTurn === 0) return tryPlayCard(s, 0, card)
      return s
    })
  }, [])

  const onSubmitBid = useCallback((choice: BidChoice) => {
    setState((s) => submitBid(s, 0, choice.bid, choice.nil, choice.blindNil))
  }, [])

  const onUpdateSpadesRules = useCallback(
    (rules: Partial<SpadesRulesConfig>) => {
      setPrefs((prev) => ({ ...prev, spadesRules: { ...prev.spadesRules, ...rules } }))
      setState((s) => setSpadesRules(s, rules))
    },
    [setPrefs],
  )

  const onNextHand = useCallback(() => setState((s) => nextHand(s)), [])
  const onShowMatchResults = useCallback(() => setState((s) => showMatchResults(s)), [])

  const onNewGame = useCallback(() => {
    clearGame('spades')
    matchTrack.current = { hands: 0, hadBagPenalty: false, prevNsScore: 0 }
    setState(() =>
      startNewGame(
        createInitialState({
          seats: prefsRef.current.seats,
          spadesRules: prefsRef.current.spadesRules,
        }),
      ),
    )
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
    onSubmitBid,
    onUpdateSpadesRules,
    onNextHand,
    onShowMatchResults,
    onNewGame,
    onUpdateDifficulty,
    onUpdateName,
    onUpdateCharacter,
    setGameSpeed,
    setAutoFinishHand,
    setFeltStyle,
    setHapticsEnabled,
    setHumorMode,
    setCardBack,
  }
}
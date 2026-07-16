import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Seat, AiDifficulty } from '../core/types'
import {
  SpadesState,
  advanceAfterTrick,
  clearWarning,
  createInitialState,
  hydrateSpadesFromPrefs,
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
  defaultSpadesMatchTrack,
  type SpadesMatchTrack,
} from '../matchTrack'
import {
  checkSpadesHandAchievements,
  checkSpadesMatchAchievements,
  spadesHandInputFromState,
} from '../achievements/spades'
import { recordGoalEvent } from '../goals'
import {
  applyHumanSeats,
  humanPartnershipTeam,
  humanTeamWon,
  uiSeat,
} from '../passAndPlay'
import { recordMatchEnd, recordSpadesHandEnd } from '../stats'
import { teamHandResult } from '../games/spades/scoring'
import type { BidChoice } from '../components/SpadesBidPanel'
import type { SpadesRulesConfig } from '../games/spades/types'
import { SPADES_BID_RECAP_HOLD_MS } from '../games/spades/pacing'
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
      return hydrateSpadesFromPrefs(saved.current.state as SpadesState, prefs)
    }
    return createInitialState({ seats: prefs.seats, spadesRules: prefs.spadesRules })
  })
  const [hasSave, setHasSave] = useState(() => saved.current?.gameId === 'spades')
  const matchTrack = useRef<SpadesMatchTrack>(
    (() => {
      const t = saved.current?.matchTrack
      if (t && saved.current?.gameId === 'spades' && 'hadBagPenalty' in t) {
        return t as SpadesMatchTrack
      }
      return defaultSpadesMatchTrack()
    })(),
  )
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    if (paused) return
    setState((s) => applyHumanSeats(s, prefs))
  }, [prefs, paused])

  useEffect(() => {
    if (paused) return
    const p = prefsRef.current
    saveGame(state, 'spades', matchTrack.current, {
      passAndPlay: p.passAndPlay,
      humanSeats: p.humanSeats,
    })
    setHasSave(
      state.phase === 'bidding' ||
        state.phase === 'playing' ||
        state.phase === 'trick_reveal' ||
        state.phase === 'hand_result',
    )
  }, [state, paused])

  const currentTrickLen = state.currentTrick?.length ?? 0
  const completedTrickLen = state.completedTricks?.length ?? 0
  const southHandLen = state.players[0].hand.length

  useEffect(() => {
    if (paused) return
    shell.clearTimer()
    const timing = SPEED_TIMING[prefsRef.current.gameSpeed]

    if (state.phase === 'trick_reveal') {
      const finalTrick = southHandLen === 0
      const revealMs = finalTrick
        ? Math.max(timing.trickRevealMs, timing.holdMs + 380)
        : timing.trickRevealMs
      shell.timerRef.current = window.setTimeout(() => {
        setState((s) => advanceAfterTrick(s))
      }, revealMs)
      return
    }

    if (
      (state.phase === 'playing' || state.phase === 'bidding') &&
      state.whoseTurn != null
    ) {
      const seat = state.whoseTurn
      const player = state.players[seat]
      if (!player.isHuman) {
        const recapWait = Math.max(0, bidRecapHoldUntil.current - Date.now())
        shell.timerRef.current = window.setTimeout(() => {
          setState((s) => runAiTurn(s))
        }, Math.max(timing.aiMs + timing.flightPadMs, timing.flightMs + 80) + recapWait)
      }
    }
  }, [
    paused,
    state.phase,
    state.whoseTurn,
    currentTrickLen,
    completedTrickLen,
    southHandLen,
    state.players,
    prefs.gameSpeed,
    shell,
    bidRecapEpoch,
  ])

  useEffect(() => {
    if (paused || !state.warning) return
    const t = window.setTimeout(() => setState((s) => clearWarning(s)), 2600)
    return () => window.clearTimeout(t)
  }, [state.warning, paused])

  const statsPhase = useRef(state.phase)
  const bidRecapHoldUntil = useRef(0)
  const [bidRecapEpoch, setBidRecapEpoch] = useState(0)
  useEffect(() => {
    if (paused) return
    const prev = statsPhase.current
    statsPhase.current = state.phase
    if (prev === state.phase) return

    if (prev === 'bidding' && state.phase === 'playing') {
      // Pass-and-play: hold AI until the table dismisses the bid recap.
      // Solo: fixed hold so the banner can play out.
      const pp = prefsRef.current.passAndPlay
      bidRecapHoldUntil.current = pp
        ? Number.POSITIVE_INFINITY
        : Date.now() + SPADES_BID_RECAP_HOLD_MS
    }

    if (state.phase === 'bidding' && prev !== 'bidding') {
      const yourTeam = humanPartnershipTeam(prefsRef.current)
      matchTrack.current.prevTeamScore = state.teamScores[yourTeam]
    }
    if (state.phase === 'hand_result') {
      const mt = matchTrack.current
      const yourTeam = humanPartnershipTeam(prefsRef.current)
      mt.hands += 1
      const handPts = state.handScores?.[yourTeam] ?? 0
      if (state.teamScores[yourTeam] < mt.prevTeamScore + handPts) mt.hadBagPenalty = true
      mt.prevTeamScore = state.teamScores[yourTeam]

      const handInput = spadesHandInputFromState(state, prefsRef.current)
      const summary = state.lastHandSummary
      const teamSet = summary ? teamHandResult(yourTeam, summary) === 'set' : false
      const hadBagPenalty = (summary?.teams[yourTeam].bagPenalty ?? 0) > 0
      const humanNilMade = handInput.humanNil && handInput.humanTricks === 0
      const stats = recordSpadesHandEnd({
        humanNil: handInput.humanNil,
        humanNilMade,
        humanBlindNil: handInput.humanBlindNil,
        humanBlindNilMade: humanNilMade && handInput.humanBlindNil,
        teamMadeBid: handInput.teamMadeBid,
        teamSet,
        hadBagPenalty,
      })
      recordGoalEvent({ metric: 'hands_played' }, 'spades')
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
      const yourTeam = humanPartnershipTeam(prefsRef.current)
      const humanWon = humanTeamWon(state.winner, prefsRef.current)
      const stats = recordMatchEnd(
        {
          humanWon,
          humanScore: state.teamScores[yourTeam],
          winnerScore: state.teamScores[state.winner],
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
          teamScore: state.teamScores[yourTeam],
          raceTo: state.rules?.raceTo ?? 500,
          hadBagPenalty: mt.hadBagPenalty,
          handsInMatch: mt.hands,
        },
        stats,
      )
      shell.queueUnlocks(unlocked)
      matchTrack.current = { hands: 0, hadBagPenalty: false, prevTeamScore: 0 }
    }
  }, [state, paused, shell])

  const updateSeat = useCallback(
    (seat: Seat, patch: Partial<UserPrefs['seats'][Seat]>) => {
      setPrefs((prev) => {
        const next = {
          ...prev,
          seats: { ...prev.seats, [seat]: { ...prev.seats[seat], ...patch } },
        }
        setState((s) => hydrateSpadesFromPrefs(s, next))
        return next
      })
    },
    [setPrefs],
  )

  const play = useCallback(() => {
    clearGame('spades')
    matchTrack.current = { hands: 0, hadBagPenalty: false, prevTeamScore: 0 }
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
      if (g.passPlay) {
        setPrefs((p) => ({
          ...p,
          passAndPlay: g.passPlay!.passAndPlay,
          humanSeats: g.passPlay!.humanSeats,
        }))
      }
      setState(hydrateSpadesFromPrefs(g.state as SpadesState, prefsRef.current))
      const t = g.matchTrack
      matchTrack.current =
        t && 'hadBagPenalty' in t ? (t as SpadesMatchTrack) : defaultSpadesMatchTrack()
      setHasSave(true)
      return true
    }
    return false
  }, [setPrefs])

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
    matchTrack.current = { hands: 0, hadBagPenalty: false, prevTeamScore: 0 }
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
      const seat = uiSeat(s, prefsRef.current)
      if (s.phase === 'playing' && s.whoseTurn === seat) return tryPlayCard(s, seat, card)
      return s
    })
  }, [])

  const onSubmitBid = useCallback((choice: BidChoice) => {
    setState((s) => {
      const seat = s.whoseTurn
      if (seat == null) return s
      return submitBid(s, seat, choice.bid, choice.nil, choice.blindNil)
    })
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
    matchTrack.current = { hands: 0, hadBagPenalty: false, prevTeamScore: 0 }
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

  const releaseBidRecapHold = useCallback(() => {
    bidRecapHoldUntil.current = 0
    setBidRecapEpoch((n) => n + 1)
  }, [])

  return {
    state,
    hasSave,
    legal: getLegalForHuman(state, uiSeat(state, prefs)),
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
    releaseBidRecapHold,
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
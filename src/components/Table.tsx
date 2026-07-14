import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { HeartsState } from '../games/hearts/engine'
import { Card, Seat } from '../core/types'
import { isQueenOfSpades } from '../games/hearts/scoring'
import { PlayerSeat } from './PlayerSeat'
import { TableHeader } from './TableHeader'
import { HeartsDramaBanners } from './HeartsDramaBanners'
import { seatViewsFromHearts } from '../games/tablePlayer'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { PassTray } from './PassTray'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { AchievementToast } from './AchievementToast'
import { Toast } from './Toast'
import { LastTrickModal } from './LastTrickModal'
import { TableMenu } from './TableMenu'
import { Scoreboard } from './Scoreboard'
import { Overlay } from './Overlay'
import {
  fxDeal,
  fxHandEnd,
  fxHeartsBroken,
  fxIllegal,
  fxPassCard,
  fxPassConfirm,
  fxPlayCard,
  fxQueenTaken,
  fxTrickWin,
  fxYourTurn,
} from '../fx'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { passSource, passTarget } from '../games/hearts/rules'
import { gameCoachTips, hasSeenCoach } from '../coach'
import { CoachTips } from './CoachTips'
import { usePassReady } from '../hooks/usePassReady'
import { humanWonHearts, isHumanControlled, uiSeat, type HumanSeatsConfig } from '../passAndPlay'
import { PassDeviceBanner } from './PassDeviceBanner'
import {
  humorAiThinking,
  humorDeal,
  humorHandDone,
  humorHeartsBroken,
  humorIllegal,
  humorMatchEnd,
  humorMoon,
  humorPass,
  humorQueen,
  humorRacing,
  humorReceive,
  humorTrickWin,
  humorYourTurn,
} from '../humor'
import './Table.css'

interface Props {
  state: HeartsState
  legal: Card[]
  autoFinishHand?: boolean
  feltStyle?: string
  hapticsEnabled?: boolean
  soundEnabled?: boolean
  humorMode?: boolean
  passAndPlay?: boolean
  humanSeats?: HumanSeatsConfig
  /** Used for deal intro + animation timing */
  gameSpeed?: GameSpeed
  onCardClick: (card: Card) => void
  onConfirmPass: () => void
  onAcceptReceived: () => void
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  achievementToast?: import('../hooks/useAchievementToast').ToastUnlock | null
  onAchievementDone?: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
}

type FlightKind = 'pass' | 'pass-out' | 'pass-in' | 'play-in' | 'play-ai'

interface FlightState {
  kind: FlightKind
  card: Card
  from: FlightRect
  to: FlightRect
  size: 'hand' | 'trick' | 'slot'
  durationMs: number
}

type DramaKind = 'hearts' | 'queen' | null

export function Table({
  state,
  legal,
  autoFinishHand = true,
  feltStyle = 'green',
  hapticsEnabled = true,
  soundEnabled = false,
  humorMode = false,
  passAndPlay = false,
  humanSeats = { 0: true, 1: false, 2: false, 3: false },
  gameSpeed = 'fast',
  onCardClick,
  onConfirmPass,
  onAcceptReceived,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onSettings,
  onStartOver,
  onAbandon,
  achievementToast,
  onAchievementDone,
}: Props) {
  const [showLast, setShowLast] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [flight, setFlight] = useState<FlightState | null>(null)
  /** Simultaneous pass-out / pass-in animations (all cards at once). */
  const [batchFlights, setBatchFlights] = useState<FlightState[]>([])
  /** Cards mid-flight — hidden in the pile until they land (includes queue). */
  const [inFlightIds, setInFlightIds] = useState<Set<string>>(() => new Set())
  const [drama, setDrama] = useState<DramaKind>(null)
  const [dramaMsg, setDramaMsg] = useState<string | null>(null)
  const prevHeartsBroken = useRef(state.heartsBroken)
  const lastQueenTrick = useRef('')
  /** Card ids that have already completed (or started) a play flight this hand */
  const settledFlights = useRef(new Set<string>())
  const flightQueue = useRef<FlightState[]>([])
  const flightBusy = useRef(false)
  const batchDoneRef = useRef<(() => void) | null>(null)
  const dramaTimer = useRef<number | null>(null)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const prevPhase = useRef(state.phase)
  const [dealing, setDealing] = useState(false)
  const [coachOpen, setCoachOpen] = useState(() => !hasSeenCoach('hearts'))
  const passInAnimated = useRef(false)
  const seats = useMemo(() => seatViewsFromHearts(state.players), [state.players])

  const fxPrefs = useMemo(
    () => ({ hapticsEnabled, soundEnabled }),
    [hapticsEnabled, soundEnabled],
  )
  const pace = SPEED_TIMING[gameSpeed]
  const flightMs = pace.flightMs

  // Deal intro — skip only Instant + reduced motion; Fast gets a snappy cascade
  useEffect(() => {
    if (state.handNumber <= 0) return
    if (gameSpeed === 'instant') return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    setDealing(true)
    fxDeal(fxPrefs)
    const ms = gameSpeed === 'fast' ? 720 : gameSpeed === 'slow' ? 1400 : 1100
    const t = window.setTimeout(() => setDealing(false), ms)
    return () => window.clearTimeout(t)
  }, [state.handNumber, gameSpeed, fxPrefs])

  const pp = useMemo(() => ({ passAndPlay, humanSeats }), [passAndPlay, humanSeats])
  const you = useMemo(() => uiSeat(state, pp), [state.whoseTurn, pp])
  const { showPass, acknowledge, canAct } = usePassReady(state.whoseTurn, pp)
  const humanTurn =
    state.whoseTurn != null && isHumanControlled(state.whoseTurn, pp) && canAct
  const viewer = state.players[you]
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const selectedIds = useMemo(
    () => new Set(viewer.selectedPass.map((c) => c.id)),
    [viewer.selectedPass],
  )
  const flyingIds = inFlightIds

  const playerNames = useMemo(() => {
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[s] = state.players[s].name
    return names
  }, [state.players])

  const passFocus =
    state.phase === 'passing' || state.phase === 'receiving'

  const yourTurn =
    humanTurn && state.phase === 'playing' && state.whoseTurn === you && !flight
  const passYourTurn = humanTurn && state.phase === 'passing' && state.whoseTurn === you && !flight

  const receivedFromName = useMemo(() => {
    if (state.phase !== 'receiving') return undefined
    const dir = state.passDirection
    if (dir === 'hold') return undefined
    // Inverse of pass: who is sending cards TO you this round
    const seat = state.whoseTurn ?? 0
    return state.players[passSource(seat, dir)].name
  }, [state.phase, state.passDirection, state.players, state.whoseTurn])

  // Stable banter for the current beat (don't re-roll every render)
  const passDeviceMode = useMemo((): import('./PassDeviceBanner').PassDeviceMode => {
    if (state.phase === 'passing') return 'pass'
    if (state.phase === 'receiving') return 'receive'
    return 'turn'
  }, [state.phase])

  const statusText = useMemo(() => {
    if (passFocus) {
      if (state.phase === 'passing' && state.whoseTurn != null) {
        const name = state.players[state.whoseTurn].name
        if (humorMode) return humorPass()
        return state.whoseTurn === you
          ? `Select ${state.rules.passCount} cards to pass`
          : `Waiting for ${name} to pass`
      }
      if (state.phase === 'receiving' && state.whoseTurn != null) {
        const name = state.players[state.whoseTurn].name
        if (humorMode && receivedFromName) return humorReceive(receivedFromName)
        return state.whoseTurn === you
          ? receivedFromName
            ? `Review cards from ${receivedFromName}`
            : 'Review received cards'
          : `Waiting for ${name} to accept`
      }
      return null
    }
    if (state.racingOut) {
      if (humorMode) return humorRacing()
      return autoFinishHand
        ? '⚡ All points out — auto-finishing…'
        : 'All points are out — play out the hand'
    }
    if (state.message && state.phase === 'trick_reveal') {
      if (!humorMode) return state.message
      const ptsMatch = state.message.match(/(\d+)\s*pt/)
      const pts = ptsMatch ? Number(ptsMatch[1]) : 0
      const nameMatch = state.message.match(/^(.+?)\s+(takes|wins)/i)
      if (nameMatch) return humorTrickWin(nameMatch[1], pts)
      return state.message
    }
    if (state.phase === 'playing' && state.whoseTurn != null) {
      const p = state.players[state.whoseTurn]
      if (p.isHuman) {
        return humorMode
          ? humorYourTurn()
          : 'Your turn — drag a card up, release to play'
      }
      return humorMode ? humorAiThinking(p.name) : `${p.name} is thinking…`
    }
    if (state.message) {
      if (humorMode && /cards passed|2♣ leads/i.test(state.message)) {
        return humorDeal()
      }
      return state.message
    }
    return ''
  }, [
    passFocus,
    humorMode,
    state.phase,
    state.racingOut,
    state.message,
    state.whoseTurn,
    state.players,
    autoFinishHand,
    receivedFromName,
    you,
    state.rules.passCount,
    // re-roll when trick count changes so lines refresh between tricks
    state.completedTricks.length,
  ])

  const overlayHumor = useMemo(() => {
    if (!humorMode) return null
    if (state.phase === 'game_over' && state.winner != null) {
      return humorMatchEnd(
        state.players[state.winner].name,
        humanWonHearts(state.winner, pp),
      )
    }
    if (state.phase === 'hand_result') {
      if (state.moonShooter != null) {
        return humorMoon(state.players[state.moonShooter].name)
      }
      return humorHandDone()
    }
    return null
  }, [humorMode, state.phase, state.winner, state.moonShooter, state.players, pp])

  const trickPlays =
    state.phase === 'trick_reveal' && state.lastTrick
      ? state.lastTrick.plays
      : state.currentTrick

  const fireDrama = useCallback((kind: DramaKind, message: string) => {
    if (dramaTimer.current != null) window.clearTimeout(dramaTimer.current)
    setDrama(kind)
    setDramaMsg(message)
    const ms = kind === 'queen' ? 2000 : kind === 'hearts' ? 2400 : 1600
    dramaTimer.current = window.setTimeout(() => {
      setDrama(null)
      setDramaMsg(null)
      dramaTimer.current = null
    }, ms)
  }, [])

  // Hearts broken moment
  useEffect(() => {
    if (state.heartsBroken && !prevHeartsBroken.current) {
      fireDrama(
        'hearts',
        humorMode ? humorHeartsBroken() : '♥ Hearts are broken!',
      )
      fxHeartsBroken(fxPrefs)
    }
    prevHeartsBroken.current = state.heartsBroken
  }, [state.heartsBroken, fireDrama, fxPrefs, humorMode])

  // Queen of Spades taken — purple banner + felt flash (always name the taker)
  useEffect(() => {
    if (state.phase !== 'trick_reveal' || !state.lastTrick) return
    const key = state.lastTrick.plays.map((p) => p.card.id).join(',')
    if (key === lastQueenTrick.current) return
    lastQueenTrick.current = key
    const hasQueen = state.lastTrick.plays.some((p) => isQueenOfSpades(p.card))
    if (hasQueen) {
      const taker = state.players[state.lastTrick.winner]
      // Always lead with who took it; humor is extra flavor after the name
      const line = humorMode
        ? `${taker.name} takes the Queen! ${humorQueen()}`
        : `${taker.name} takes the Queen!`
      fireDrama('queen', line)
      fxQueenTaken(fxPrefs)
    } else {
      fxTrickWin(fxPrefs)
    }
  }, [state.phase, state.lastTrick, state.players, fireDrama, fxPrefs, humorMode])

  // Your turn chime
  useEffect(() => {
    if (
      state.phase === 'playing' &&
      state.whoseTurn === you &&
      prevTurn.current !== you
    ) {
      fxYourTurn(fxPrefs)
    }
    prevTurn.current = state.whoseTurn
  }, [state.phase, state.whoseTurn, you, fxPrefs])

  // Deal / hand-end cues
  useEffect(() => {
    if (state.phase === 'passing' && prevPhase.current !== 'passing') {
      fxDeal(fxPrefs)
    }
    if (
      (state.phase === 'hand_result' || state.phase === 'game_over') &&
      prevPhase.current !== 'hand_result' &&
      prevPhase.current !== 'game_over'
    ) {
      fxHandEnd(fxPrefs)
    }
    prevPhase.current = state.phase
  }, [state.phase, fxPrefs])

  // Illegal play toast → haptic/sound
  useEffect(() => {
    if (state.warning) fxIllegal(fxPrefs)
  }, [state.warning, fxPrefs])

  const startFlight = useCallback((next: FlightState) => {
    flightBusy.current = true
    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.add(next.card.id)
      return n
    })
    setFlight(next)
  }, [])

  const startBatchFlights = useCallback(
    (flights: FlightState[], onAllDone?: () => void) => {
      if (flights.length === 0) {
        onAllDone?.()
        return
      }
      flightBusy.current = true
      batchDoneRef.current = onAllDone ?? null
      setInFlightIds((prev) => {
        const n = new Set(prev)
        flights.forEach((f) => n.add(f.card.id))
        return n
      })
      setBatchFlights(flights)
    },
    [],
  )

  const finishBatchFlight = useCallback((cardId: string) => {
    settledFlights.current.add(cardId)
    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.delete(cardId)
      return n
    })
    setBatchFlights((prev) => {
      const next = prev.filter((f) => f.card.id !== cardId)
      if (next.length === 0) {
        flightBusy.current = false
        const done = batchDoneRef.current
        batchDoneRef.current = null
        queueMicrotask(() => done?.())
      }
      return next
    })
  }, [])

  const enqueueOrStart = useCallback(
    (next: FlightState) => {
      if (flightBusy.current) {
        // Don't stack two visuals for the same card
        if (flightQueue.current.some((f) => f.card.id === next.card.id)) {
          return
        }
        flightQueue.current.push(next)
        // Hide immediately even while queued
        setInFlightIds((prev) => {
          const n = new Set(prev)
          n.add(next.card.id)
          return n
        })
        return
      }
      startFlight(next)
    },
    [startFlight],
  )

  const finishFlight = useCallback(() => {
    const current = flight
    if (!current) {
      flightBusy.current = false
      return
    }
    const doneId = current.card.id
    const kind = current.kind
    const landed = current.card
    settledFlights.current.add(doneId)

    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.delete(doneId)
      return n
    })
    setFlight(null)

    // Human play & tray select: commit only after the flight arrives
    if (kind === 'pass' || kind === 'play-in') {
      onCardClick(landed)
    }
    // pass-out / pass-in: visual only — engine already advanced (or will)

    const next = flightQueue.current.shift()
    if (next) startFlight(next)
    else flightBusy.current = false
  }, [flight, onCardClick, startFlight])

  /** AI play flights only — human flights start from the hand click. */
  useLayoutEffect(() => {
    if (state.phase !== 'playing' && state.phase !== 'trick_reveal') return

    const plays =
      state.phase === 'trick_reveal' && state.lastTrick
        ? state.lastTrick.plays
        : state.currentTrick
    if (plays.length === 0) return

    for (const p of plays) {
      if (isHumanControlled(p.seat, pp)) continue
      if (settledFlights.current.has(p.card.id)) continue
      if (inFlightIds.has(p.card.id)) continue

      settledFlights.current.add(p.card.id)

      const felt = document.querySelector(
        '[data-trick-felt]',
      ) as HTMLElement | null
      const from = seatOriginRect(p.seat)
      if (!from) continue
      const face = document.querySelector(
        `[data-trick-card="${p.card.id}"] .card`,
      ) as HTMLElement | null
      const to =
        face && face.getBoundingClientRect().width > 8
          ? rectOf(face)
          : felt
            ? trickSeatRect(felt, p.seat, p.card.id)
            : {
                left: window.innerWidth / 2 - 40,
                top: window.innerHeight / 2 - 56,
                width: 100,
                height: 140,
              }

      enqueueOrStart({
        kind: 'play-ai',
        card: p.card,
        from,
        to,
        size: 'hand',
        durationMs: flightMs,
      })
    }
  }, [
    state.phase,
    state.currentTrick,
    state.lastTrick,
    inFlightIds,
    enqueueOrStart,
    flightMs,
    pp,
  ])

  // Clear per-hand flight tracking
  useEffect(() => {
    settledFlights.current = new Set()
    flightQueue.current = []
    flightBusy.current = false
    setInFlightIds(new Set())
    setFlight(null)
    setBatchFlights([])
    batchDoneRef.current = null
    lastQueenTrick.current = ''
    passInAnimated.current = false
  }, [state.handNumber])

  const handleHandClick = useCallback(
    (card: Card, el: HTMLElement) => {
      if (flightBusy.current || flight || batchFlights.length > 0) return

      // —— Pass mode: fly into tray ——
      if (state.phase === 'passing') {
        if (selectedIds.has(card.id)) {
          onCardClick(card)
          return
        }
        if (viewer.selectedPass.length >= state.rules.passCount) {
          onCardClick(card)
          return
        }
        const slotIndex = viewer.selectedPass.length
        const slot = document.querySelector(
          `[data-pass-slot="${slotIndex}"]`,
        ) as HTMLElement | null
        if (!slot) {
          onCardClick(card)
          return
        }
        fxPassCard(fxPrefs)
        settledFlights.current.add(card.id)
        startFlight({
          kind: 'pass',
          card,
          from: rectOf(el),
          to: rectOf(slot),
          size: 'slot',
          durationMs: Math.min(flightMs, 280),
        })
        return
      }

      // —— Play: fly from exact hand card → pile, then commit ——
      if (state.phase === 'playing' && state.whoseTurn === you) {
        if (legalIds.size > 0 && !legalIds.has(card.id)) {
          onCardClick(card)
          return
        }
        const from = rectOf(el)
        const felt = document.querySelector(
          '[data-trick-felt]',
        ) as HTMLElement | null
        const to = felt
          ? trickSeatRect(felt, you)
          : {
              left: window.innerWidth / 2 - 50,
              top: window.innerHeight / 2 + 40,
              width: 110,
              height: 154,
            }
        settledFlights.current.add(card.id)
        fxPlayCard(fxPrefs)
        startFlight({
          kind: 'play-in',
          card,
          from,
          to,
          size: 'hand',
          durationMs: flightMs,
        })
        return
      }

      onCardClick(card)
    },
    [
      state.phase,
      state.whoseTurn,
      state.rules.passCount,
      flight,
      batchFlights.length,
      selectedIds,
      viewer.selectedPass.length,
      legalIds,
      onCardClick,
      fxPrefs,
      startFlight,
      flightMs,
      you,
    ],
  )

  // Confirm pass: fly cards to target seat, then engine exchange + receive flights
  const handleConfirmPass = useCallback(() => {
    if (state.phase !== 'passing') return
    const need = state.rules.passCount
    const selected = viewer.selectedPass
    if (selected.length !== need) {
      onConfirmPass() // engine sets warning
      return
    }
    fxPassConfirm(fxPrefs)

    const dir = state.passDirection
    if (dir === 'hold') {
      onConfirmPass()
      return
    }

    // Reduced motion / instant: skip seat flights
    if (
      gameSpeed === 'instant' ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    ) {
      onConfirmPass()
      return
    }

    const targetSeat = passTarget(you, dir)
    const to =
      seatOriginRect(targetSeat) ?? {
        left: window.innerWidth / 2 - 28,
        top: window.innerHeight * 0.28,
        width: 56,
        height: 78,
      }

    passInAnimated.current = false
    const flights = selected.map((card, i) => {
      const slot = document.querySelector(
        `[data-pass-slot="${i}"]`,
      ) as HTMLElement | null
      const from = slot
        ? rectOf(slot)
        : {
            left: window.innerWidth / 2 - 30 + i * 12,
            top: window.innerHeight * 0.45,
            width: 60,
            height: 84,
          }
      return {
        kind: 'pass-out' as const,
        card,
        from,
        to: {
          ...to,
          left: to.left + (i - 1) * 10,
          top: to.top + (i - 1) * 6,
        },
        size: 'slot' as const,
        durationMs: Math.min(flightMs + 40, 360),
      }
    })
    startBatchFlights(flights, onConfirmPass)
  }, [
    state.phase,
    state.rules.passCount,
    state.passDirection,
    viewer.selectedPass,
    onConfirmPass,
    you,
    fxPrefs,
    gameSpeed,
    startBatchFlights,
    flightMs,
  ])

  // After confirmPass → receiving: fly cards from source seat into tray
  useEffect(() => {
    if (state.phase !== 'receiving') {
      if (state.phase === 'passing') passInAnimated.current = false
      return
    }
    if (passInAnimated.current) return
    if (state.receivedCards.length === 0) return

    if (
      gameSpeed === 'instant' ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    ) {
      passInAnimated.current = true
      return
    }

    const dir = state.passDirection
    if (dir === 'hold') {
      passInAnimated.current = true
      return
    }

    passInAnimated.current = true
    const fromSeat = passSource(you, dir)
    const from =
      seatOriginRect(fromSeat) ?? {
        left: window.innerWidth / 2 - 28,
        top: 80,
        width: 56,
        height: 78,
      }

    // Small delay so tray mounts
    const t = window.setTimeout(() => {
      const flights = state.receivedCards.map((card, i) => {
        const slot = document.querySelector(
          `[data-pass-slot="${i}"]`,
        ) as HTMLElement | null
        const to = slot
          ? rectOf(slot)
          : {
              left: window.innerWidth / 2 - 40 + i * 40,
              top: window.innerHeight * 0.4,
              width: 72,
              height: 100,
            }
        return {
          kind: 'pass-in' as const,
          card,
          from: {
            ...from,
            left: from.left + (i - 1) * 8,
          },
          to,
          size: 'slot' as const,
          durationMs: Math.min(flightMs + 60, 380),
        }
      })
      startBatchFlights(flights)
    }, 40)
    return () => window.clearTimeout(t)
  }, [
    state.phase,
    state.receivedCards,
    state.passDirection,
    gameSpeed,
    startBatchFlights,
    flightMs,
  ])

  // Pass: selected leave hand. Play-in flight: hide until commit.
  const southHand = viewer.hand
  const passHandCards =
    state.phase === 'passing'
      ? southHand.filter((c) => !selectedIds.has(c.id) && !flyingIds.has(c.id))
      : southHand.filter((c) => !flyingIds.has(c.id))

  return (
    <div
      className={[
        'table-screen',
        passFocus ? 'table-screen--passing' : '',
        drama === 'hearts' ? 'table-screen--drama-hearts' : '',
        drama === 'queen' ? 'table-screen--drama-queen' : '',
        yourTurn ? 'table-screen--your-turn' : '',
        dealing ? 'table-screen--dealing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-felt={feltStyle}
    >
      <TableHeader
        gameLabel="Hearts"
        gameIcon="♥"
        handNumber={state.handNumber}
        raceTo={state.rules.raceTo}
        metaExtra={state.heartsBroken ? '♥ broken' : '♥ locked'}
        onOpenMenu={() => setShowMenu(true)}
        onOpenScores={() => setShowScores(true)}
        onOpenLastTrick={() => setShowLast(true)}
        onSettings={onSettings}
      />

      <div className="table-grid">
        <div className="table-grid__north">
          <PlayerSeat
            player={seats[2]}
            position="north"
            isTurn={state.whoseTurn === 2}
            raceTo={state.rules.raceTo}
          />
        </div>

        <div className="table-grid__west">
          <PlayerSeat
            player={seats[1]}
            position="west"
            isTurn={state.whoseTurn === 1}
            raceTo={state.rules.raceTo}
          />
        </div>

        <div className="table-grid__center">
          <TrickArea
            plays={trickPlays}
            playerNames={playerNames}
            reveal={state.phase === 'trick_reveal'}
            hiddenCardIds={flyingIds}
            holdMs={pace.holdMs}
          />
        </div>

        <div className="table-grid__east">
          <PlayerSeat
            player={seats[3]}
            position="east"
            isTurn={state.whoseTurn === 3}
            raceTo={state.rules.raceTo}
          />
        </div>

        <div className="table-grid__south">
          {statusText && (
            <div
              className={`status-bar ${
                state.racingOut && autoFinishHand ? 'status-bar--racing' : ''
              } ${passFocus ? 'status-bar--pass' : ''} ${
                yourTurn || passYourTurn ? 'status-bar--your-turn' : ''
              }`}
            >
              <span className="status-bar__text">{statusText}</span>
              <span className="status-bar__score-block">
                <span className="status-bar__score" title="Match score">
                  <span className="status-bar__score-label">Score</span>
                  <span className="status-bar__score-value">
                    {viewer.totalScore}
                  </span>
                </span>
                <span
                  className={`status-bar__pill status-bar__pill--h ${
                    viewer.handHearts > 0 ? 'is-hot' : ''
                  }`}
                  title="Hearts this hand"
                >
                  <span className="status-bar__pill-icon">♥</span>
                  <span className="status-bar__pill-value">{viewer.handHearts}</span>
                </span>
                <span
                  className={`status-bar__pill status-bar__pill--q ${
                    viewer.hasQueen ? 'is-hot' : ''
                  }`}
                  title="Queen of Spades"
                >
                  <span className="status-bar__pill-icon">♠</span>
                  <span className="status-bar__pill-value">
                    {viewer.hasQueen ? 'Q' : '–'}
                  </span>
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {(state.phase === 'passing' || state.phase === 'receiving') && (
        <div className="pass-stage">
          <PassTray
            selected={
              state.phase === 'receiving' ? state.receivedCards : viewer.selectedPass
            }
            passCount={state.rules.passCount}
            direction={state.passDirection}
            handNumber={state.handNumber}
            receiving={state.phase === 'receiving'}
            receivedFromName={receivedFromName}
            activePlayerName={
              state.whoseTurn != null ? state.players[state.whoseTurn].name : undefined
            }
            canInteract={
              !showPass &&
              state.whoseTurn === you &&
              (state.phase === 'passing' || state.phase === 'receiving')
            }
            onConfirm={
              state.phase === 'receiving' ? onAcceptReceived : handleConfirmPass
            }
            onRemove={state.phase === 'passing' && !showPass ? onCardClick : undefined}
            nextSlotIndex={
              state.phase === 'passing' &&
              viewer.selectedPass.length < state.rules.passCount
                ? viewer.selectedPass.length
                : undefined
            }
          />
        </div>
      )}

      <footer
        className={`table-hand ${yourTurn ? 'table-hand--your-turn' : ''}`}
        data-seat-anchor={String(you)}
      >
        <Hand
          cards={passHandCards}
          legalIds={
            state.phase === 'playing' && state.whoseTurn === you
              ? legalIds
              : undefined
          }
          interactive={
            !flight &&
            batchFlights.length === 0 &&
            state.phase !== 'receiving' &&
            (passYourTurn || yourTurn)
          }
          passMode={state.phase === 'passing'}
          yourTurn={yourTurn || passYourTurn}
          flyingIds={flyingIds}
          onCardClick={handleHandClick}
        />
      </footer>

      {flight && (
        <CardFlight
          key={flight.card.id}
          card={flight.card}
          from={flight.from}
          to={flight.to}
          size={flight.size}
          durationMs={flight.durationMs}
          onDone={finishFlight}
        />
      )}

      {batchFlights.map((f) => (
        <CardFlight
          key={f.card.id}
          card={f.card}
          from={f.from}
          to={f.to}
          size={f.size}
          durationMs={f.durationMs}
          onDone={() => finishBatchFlight(f.card.id)}
        />
      ))}

      {coachOpen && (
        <CoachTips
          open={coachOpen}
          onDone={() => setCoachOpen(false)}
          tips={gameCoachTips('hearts', pp)}
          gameId="hearts"
        />
      )}

      {/* Full-screen purple/rose flash + center banner — hard to miss on mobile */}
      {drama === 'queen' && (
        <div className="drama-flash drama-flash--queen" aria-hidden />
      )}
      {drama === 'hearts' && (
        <div className="drama-flash drama-flash--hearts" aria-hidden />
      )}
      <HeartsDramaBanners drama={drama} message={dramaMsg} />

      <Toast
        message={
          state.warning
            ? humorMode
              ? `${humorIllegal()} ${state.warning}`
              : state.warning
            : null
        }
        tone="warn"
      />
      {showPass && state.whoseTurn != null && (
        <PassDeviceBanner
          playerName={state.players[state.whoseTurn].name}
          onReady={acknowledge}
          mode={passDeviceMode}
        />
      )}
      <Scoreboard
        state={state}
        open={showScores}
        onClose={() => setShowScores(false)}
      />
      <LastTrickModal
        open={showLast}
        trick={state.lastTrick}
        playerNames={playerNames}
        gameIcon="♥"
        gameLabel="Last trick"
        onClose={() => setShowLast(false)}
      />
      <AchievementToast
        achievement={achievementToast ?? null}
        soundEnabled={soundEnabled}
        hapticsEnabled={hapticsEnabled}
        onDone={() => onAchievementDone?.()}
      />
      <Overlay
        state={state}
        passPlay={pp}
        onNextHand={onNextHand}
        onShowMatchResults={onShowMatchResults}
        onNewGame={onNewGame}
        onHome={onHome}
        onReviewLastTrick={() => setShowLast(true)}
        humorMode={humorMode}
        humorLine={overlayHumor}
      />

      <TableMenu
        open={showMenu}
        gameLabel="Hearts"
        gameIcon="♥"
        onClose={() => setShowMenu(false)}
        onSettings={onSettings}
        onHome={onHome}
        onStartOver={onStartOver}
        onAbandon={onAbandon}
      />
    </div>
  )
}

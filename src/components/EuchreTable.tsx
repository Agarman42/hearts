import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { EuchreState } from '../games/euchre/engine'

import { trickWinner } from '../games/euchre/rules'
import { sortEuchreHand } from '../games/euchre/hand'
import { Card, Seat } from '../core/types'
import { SUIT_SYMBOL } from '../core/types'
import { partnershipOf } from '../core/partnership'
import { seatViewsFromEuchre } from '../games/tablePlayer'
import type { GameAction } from '../multiplayer/protocol'
import { engineSeatFromSlot, screenSlot } from '../multiplayer/seats'
import { PlayerSeat } from './PlayerSeat'
import { GoalHud, type GoalHudItem } from './GoalHud'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { CardView } from './CardView'
import { TableHeader } from './TableHeader'
import { TableMenu } from './TableMenu'
import { EuchreTrumpPanel } from './EuchreTrumpPanel'
import { EuchreLonerPanel } from './EuchreLonerPanel'
import { EuchreScoreboard } from './EuchreScoreboard'
import { EuchreOverlay } from './EuchreOverlay'
import { EuchreDramaBanners } from './EuchreDramaBanners'
import { LastTrickModal } from './LastTrickModal'
import { AchievementToast } from './AchievementToast'
import { Confetti } from './Confetti'
import { SetReaction } from './SetReaction'
import { CoachTips } from './CoachTips'
import { Toast } from './Toast'
import { gameCoachTips, hasSeenCoach } from '../coach'
import {
  CardFlight,
  type FlightRect,
  rectOf,
  seatOriginRect,
  trickSeatRect,
} from './CardFlight'
import { usePassReady } from '../hooks/usePassReady'
import {
  humanPartnershipTeam,
  isHumanControlled,
  uiSeat,
  type HumanSeatsConfig,
} from '../passAndPlay'
import { SPEED_TIMING, type GameSpeed } from '../prefs'
import { PassDeviceBanner } from './PassDeviceBanner'
import {
  humorEuchreAiThinking,
  humorEuchreIllegal,
  humorEuchreLoner,
  humorEuchreStick,
  humorEuchreTrickWin,
  humorEuchreTrump,

  humorActive,
  withHumor,
} from '../humor'
import {
  fxDeal,
  fxEuchreTrump,
  fxHandEnd,
  fxIllegal,
  fxPlayCard,
  fxTrickWin,
  fxYourTurn,
} from '../fx'
import './Table.css'
import './Overlay.css'
import { EuchrePlayerHud } from './EuchrePlayerHud'

import { EuchreDiscardPanel } from './EuchreDiscardPanel'
import { EuchreTrumpCallRecap } from './EuchreTrumpCallRecap'
import { EuchreLonerRecap } from './EuchreLonerRecap'
import { EuchreDiscardRecap } from './EuchreDiscardRecap'
import { partnerOf } from '../core/partnership'
import { lonerBlockedNearWin } from '../games/euchre/scoring'
import './EuchreTrumpPanel.css'
import './EuchreTable.css'

interface Props {
  state: EuchreState
  legal: Card[]
  feltStyle?: string
  hapticsEnabled?: boolean
  soundEnabled?: boolean
  humorMode?: boolean
  leftHandLayout?: boolean
  passAndPlay?: boolean
  humanSeats?: HumanSeatsConfig
  gameSpeed?: GameSpeed
  coachTipsEnabled?: boolean
  skipRecaps?: boolean
  canUndo?: boolean
  onUndoPlay?: () => void
  onCardClick: (card: import('../core/types').Card) => void
  onPass: () => void
  onOrderUp: () => void
  onNameTrump: (suit: import('../core/types').Suit) => void
  onGoAlone: () => void
  onWithPartner: () => void
  onAckTrumpCall: () => void
  onAckLonerChoice: () => void
  onAckDiscardComplete: () => void
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
  achievementToast?: import('../hooks/useAchievementToast').ToastUnlock | null
  onAchievementDone?: () => void
  /** Online: your engine seat (drawn as South). */
  mySeat?: Seat
  online?: boolean
  onOnlineAction?: (action: GameAction) => void
  /** Host-only rematch after an online match ends. */
  canRematch?: boolean
  /** Server `error` while the table is mounted (illegal play, not your turn). */
  onlineWarning?: string | null
}

interface FlightState {
  kind: 'play-ai' | 'play-in'
  card: Card
  from: FlightRect
  to: FlightRect
  durationMs: number
}

export function EuchreTable({
  state,
  legal,
  feltStyle = 'green',
  hapticsEnabled = true,
  soundEnabled = false,
  humorMode = false,
  leftHandLayout = false,
  passAndPlay = false,
  humanSeats = { 0: true, 1: false, 2: false, 3: false },
  gameSpeed = 'fast',
  coachTipsEnabled = true,
  skipRecaps = false,
  canUndo = false,
  onUndoPlay,
  onCardClick,
  onPass,
  onOrderUp,
  onNameTrump,
  onGoAlone,
  onWithPartner,
  onAckTrumpCall,
  onAckLonerChoice,
  onAckDiscardComplete,
  onNextHand,
  onShowMatchResults,
  onNewGame,
  onHome,
  onSettings,
  onStartOver,
  onAbandon,
  achievementToast,
  onAchievementDone,
  mySeat = 0,
  online = false,
  onOnlineAction,
  canRematch = false,
  onlineWarning = null,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showLast, setShowLast] = useState(false)
  const [coachOpen, setCoachOpen] = useState(
    () => coachTipsEnabled && !hasSeenCoach('euchre'),
  )
  const [peekFinalTrick, setPeekFinalTrick] = useState(false)
  const [flight, setFlight] = useState<FlightState | null>(null)
  const [inFlightIds, setInFlightIds] = useState<Set<string>>(() => new Set())
  const [dealing, setDealing] = useState(false)
  const [drama, setDrama] = useState<'trump' | 'march' | 'euchre' | 'stick' | 'loner' | null>(null)
  const [dramaMsg, setDramaMsg] = useState<string | null>(null)
  const [dramaSub, setDramaSub] = useState<string | null>(null)
  const [pendingOnlineId, setPendingOnlineId] = useState<string | null>(null)
  const [lonerSlide, setLonerSlide] = useState(false)
  const lonerSlideSeen = useRef(false)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const prevTrickLen = useRef(state.currentTrick.length)
  const prevPhase = useRef(state.phase)
  const prevTrump = useRef(state.trump)
  const prevStickWarning = useRef(false)
  const dramaTimer = useRef<number | null>(null)
  const settledFlights = useRef(new Set<string>())
  const flightQueue = useRef<FlightState[]>([])
  const flightBusy = useRef(false)
  const pace = SPEED_TIMING[gameSpeed]
  const flightMs = pace.flightMs
  const fxPrefs = useMemo(() => ({ hapticsEnabled, soundEnabled }), [hapticsEnabled, soundEnabled])
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const pp = useMemo(() => ({ passAndPlay, humanSeats }), [passAndPlay, humanSeats])
  const you = online ? mySeat : uiSeat(state, pp)
  const northSeat = online ? engineSeatFromSlot(2, you) : 2
  const westSeat = online ? engineSeatFromSlot(1, you) : 1
  const eastSeat = online ? engineSeatFromSlot(3, you) : 3
  const { showPass, acknowledge, canAct } = usePassReady(state.whoseTurn, pp)
  const passDeviceMode = useMemo((): import('./PassDeviceBanner').PassDeviceMode => {
    if (state.phase === 'bidding') return 'bid'
    if (state.phase === 'discard') return 'discard'
    if (state.phase === 'loner_choice') return 'loner'
    return 'turn'
  }, [state.phase])
  const humanTurn = online
    ? state.whoseTurn === you
    : state.whoseTurn != null && isHumanControlled(state.whoseTurn, pp) && canAct
  const yourTurn =
    humanTurn && state.phase === 'playing' && state.whoseTurn === you && !flight
  const yourBidTurn = humanTurn && state.phase === 'bidding' && state.whoseTurn === you
  const yourDiscard = humanTurn && state.phase === 'discard' && state.whoseTurn === you
  const yourLonerChoice =
    humanTurn && state.phase === 'loner_choice' && state.whoseTurn === you

  const seats = useMemo(
    () =>
      seatViewsFromEuchre(state.players, state.trump, state.sittingOut, state.maker, you),
    [state.players, state.trump, state.sittingOut, state.maker, you],
  )

  const playerNames = useMemo(() => {
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[s] = state.players[s].name
    return names
  }, [state.players])

  const screenPlayerNames = useMemo(() => {
    if (!online) return playerNames
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[screenSlot(s, you)] = playerNames[s]
    return names
  }, [online, playerNames, you])

  const toScreenPlays = useCallback(
    (plays: { seat: Seat; card: Card }[]) =>
      online ? plays.map((p) => ({ ...p, seat: screenSlot(p.seat, you) })) : plays,
    [online, you],
  )

  const emitPlay = useCallback(
    (card: Card) => {
      if (online && onOnlineAction) {
        if (state.phase === 'discard') {
          onOnlineAction({ type: 'discard', cardId: card.id })
          return
        }
        setPendingOnlineId(card.id)
        onOnlineAction({ type: 'play_card', cardId: card.id })
        return
      }
      onCardClick(card)
    },
    [online, onOnlineAction, onCardClick, state.phase],
  )

  const emitPass = useCallback(() => {
    if (online && onOnlineAction) {
      onOnlineAction({ type: 'pass_bid' })
      return
    }
    onPass()
  }, [online, onOnlineAction, onPass])

  const emitOrderUp = useCallback(() => {
    if (online && onOnlineAction) {
      onOnlineAction({ type: 'order_up' })
      return
    }
    onOrderUp()
  }, [online, onOnlineAction, onOrderUp])

  const emitNameTrump = useCallback(
    (suit: import('../core/types').Suit) => {
      if (online && onOnlineAction) {
        onOnlineAction({ type: 'name_trump', suit })
        return
      }
      onNameTrump(suit)
    },
    [online, onOnlineAction, onNameTrump],
  )

  const emitGoAlone = useCallback(() => {
    if (online && onOnlineAction) {
      onOnlineAction({ type: 'go_alone' })
      return
    }
    onGoAlone()
  }, [online, onOnlineAction, onGoAlone])

  const emitWithPartner = useCallback(() => {
    if (online && onOnlineAction) {
      onOnlineAction({ type: 'with_partner' })
      return
    }
    onWithPartner()
  }, [online, onOnlineAction, onWithPartner])

  const resolveWinner = useCallback(
    (plays: Parameters<typeof trickWinner>[0]) =>
      state.trump ? trickWinner(plays, state.trump) : 0,
    [state.trump],
  )

  const fireDrama = useCallback(
    (kind: 'trump' | 'march' | 'euchre' | 'stick' | 'loner', message: string, subtitle?: string) => {
      if (dramaTimer.current != null) window.clearTimeout(dramaTimer.current)
      setDrama(kind)
      setDramaMsg(message)
      setDramaSub(subtitle ?? null)
      const ms =
        kind === 'march' ? 4500 : kind === 'loner' ? 4000 : kind === 'euchre' ? 4200 : 2000
      dramaTimer.current = window.setTimeout(() => {
        setDrama(null)
        setDramaMsg(null)
        setDramaSub(null)
        dramaTimer.current = null
      }, ms)
    },
    [],
  )

  const startFlight = useCallback((next: FlightState) => {
    flightBusy.current = true
    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.add(next.card.id)
      return n
    })
    setFlight(next)
  }, [])

  const enqueueOrStart = useCallback(
    (next: FlightState) => {
      if (flightBusy.current) {
        if (flightQueue.current.some((f) => f.card.id === next.card.id)) return
        flightQueue.current.push(next)
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
    settledFlights.current.add(current.card.id)
    setInFlightIds((prev) => {
      const n = new Set(prev)
      n.delete(current.card.id)
      return n
    })
    setFlight(null)
    if (current.kind === 'play-in') {
      emitPlay(current.card)
    }
    const queued = flightQueue.current.shift()
    if (queued) startFlight(queued)
    else flightBusy.current = false
  }, [flight, emitPlay, startFlight])

  useLayoutEffect(() => {
    if (state.phase !== 'playing') return
    const plays = state.currentTrick
    if (plays.length === 0) return

    for (const p of plays) {
      if (online ? p.seat === you : isHumanControlled(p.seat, pp)) continue
      if (settledFlights.current.has(p.card.id)) continue
      if (inFlightIds.has(p.card.id)) continue

      settledFlights.current.add(p.card.id)

      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
      const from = seatOriginRect(p.seat)
      if (!from) continue
      const visualSeat = online ? screenSlot(p.seat, you) : p.seat
      const to = felt
        ? trickSeatRect(felt, visualSeat, p.card.id)
        : {
            left: window.innerWidth / 2 - 50,
            top: window.innerHeight / 2 + 40,
            width: 110,
            height: 154,
          }

      enqueueOrStart({
        kind: 'play-ai',
        card: p.card,
        from,
        to,
        durationMs: flightMs,
      })
    }
  }, [state.phase, state.currentTrick, inFlightIds, enqueueOrStart, flightMs, pp, online, you])

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.lastTrick) {
      setInFlightIds(new Set())
      flightQueue.current = []
      flightBusy.current = false
      setFlight(null)
      for (const p of state.lastTrick.plays) {
        settledFlights.current.add(p.card.id)
      }
    }
    if (state.currentTrick.length < prevTrickLen.current) {
      settledFlights.current.clear()
    }
    prevTrickLen.current = state.currentTrick.length
  }, [state.phase, state.lastTrick, state.currentTrick.length])

  useEffect(() => {
    settledFlights.current.clear()
    flightQueue.current = []
    flightBusy.current = false
    setInFlightIds(new Set())
    setFlight(null)
  }, [state.handNumber])

  useEffect(() => {
    if (state.trump && !prevTrump.current) {
      fxEuchreTrump(fxPrefs)
      if (!passAndPlay && !skipRecaps) {
        const label = SUIT_SYMBOL[state.trump]
        fireDrama(
          'trump',
          humorMode && humorActive() ? humorEuchreTrump() : `${label} is trump`,
        )
      }
      // Skip recap overlay: auto-ack trump call so play continues
      if (skipRecaps && state.awaitingTrumpAck && !online) {
        onAckTrumpCall()
      }
    }
    prevTrump.current = state.trump
  }, [
    state.trump,
    state.awaitingTrumpAck,
    fireDrama,
    fxPrefs,
    humorMode,
    passAndPlay,
    skipRecaps,
    onAckTrumpCall,
    online,
  ])

  useEffect(() => {
    const prev = prevPhase.current
    if (
      state.phase === 'hand_result' &&
      prev !== 'hand_result' &&
      prev !== 'game_over'
    ) {
      fxHandEnd(fxPrefs)
      const summary = state.lastHandSummary
      if (summary?.marched) {
        fireDrama(
          'march',
          humorMode ? 'March — all five!' : 'March — makers swept all five',
          summary.loner ? 'Loner march' : undefined,
        )
      } else if (summary?.euchred) {
        fireDrama(
          'euchre',
          humorMode ? 'Euchred!' : 'Euchred — defenders take the point',
          summary.loner ? 'Loner bid failed' : 'Makers needed three tricks',
        )
      }
    }
    prevPhase.current = state.phase
  }, [state.phase, state.lastHandSummary, fireDrama, fxPrefs, humorMode])

  useEffect(() => {
    if (passAndPlay) return
    if (state.warning?.toLowerCase().includes('goes alone')) {
      fireDrama(
        'loner',
        withHumor('Loner — partner sits out', humorEuchreLoner, humorMode),
      )
    }
  }, [state.warning, fireDrama, humorMode, passAndPlay])

  useEffect(() => {
    if (state.awaitingLonerAck && !passAndPlay && !online) {
      onAckLonerChoice()
    }
  }, [state.awaitingLonerAck, passAndPlay, onAckLonerChoice, online])

  useEffect(() => {
    if (state.awaitingDiscardAck && !passAndPlay && !online) {
      onAckDiscardComplete()
    }
  }, [state.awaitingDiscardAck, passAndPlay, onAckDiscardComplete, online])

  useEffect(() => {
    const stick = Boolean(state.warning?.toLowerCase().includes('stick the dealer'))
    if (stick && !prevStickWarning.current) {
      fireDrama('stick', withHumor('Stick the dealer', humorEuchreStick, humorMode))
    }
    prevStickWarning.current = stick
  }, [state.warning, fireDrama, humorMode])

  useEffect(() => {
    const msg = onlineWarning ?? state.warning
    if (msg && /illegal|not a legal|not your turn/i.test(msg)) {
      fxIllegal(fxPrefs)
    }
  }, [state.warning, onlineWarning, fxPrefs])

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

  useEffect(() => {
    if (state.whoseTurn === you && prevTurn.current !== you) {
      if (state.phase === 'playing') fxYourTurn(fxPrefs)
    }
    prevTurn.current = state.whoseTurn
  }, [state.whoseTurn, state.phase, you, fxPrefs])

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.lastTrick) fxTrickWin(fxPrefs)
  }, [state.phase, state.lastTrick, fxPrefs])

  const statusText = useMemo(() => {
    if (state.phase === 'trick_reveal' && state.message && humorMode) {
      const nameMatch = state.message.match(/^(.+?)\s+wins/)
      if (nameMatch) return humorEuchreTrickWin(nameMatch[1])
    }
    if (state.message && state.phase !== 'trick_reveal') return state.message
    if (yourBidTurn) {
      const verb = state.dealer === you ? 'pick up' : 'order up'
      return humorMode ? `Your bid — ${verb} or pass` : `Your bid — ${verb} or pass`
    }
    if (yourDiscard && state.maker != null && state.trump) {
      const maker = state.players[state.maker].name
      const sym = SUIT_SYMBOL[state.trump]
      return humorMode
        ? `${maker} ordered ${sym} — chuck one of your six. Not a pass!`
        : `${maker} ordered ${sym} trump — discard one card`
    }
    if (yourLonerChoice) return humorMode ? 'Go alone for glory (+4 march)' : 'Go alone?'
    // Play-turn prompt is the banner between HUD and hand
    if (yourTurn) return null
    if (state.whoseTurn != null) {
      const p = state.players[state.whoseTurn]
      return withHumor(`${p.name}…`, () => humorEuchreAiThinking(p.name), humorMode)
    }
    return null
  }, [state, yourBidTurn, yourDiscard, yourLonerChoice, yourTurn, humorMode, you])

  const handleHandClick = useCallback(
    (card: Card, el: HTMLElement) => {
      if (state.phase === 'discard' && state.whoseTurn === you) {
        fxPlayCard(fxPrefs)
        emitPlay(card)
        return
      }
      if (state.phase !== 'playing' || state.whoseTurn !== you) return
      if (flightBusy.current || flight) return
      if (legalIds.size > 0 && !legalIds.has(card.id)) {
        emitPlay(card)
        return
      }
      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
      const to = felt
        ? trickSeatRect(felt, online ? screenSlot(you, you) : you)
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
        from: rectOf(el),
        to,
        durationMs: flightMs,
      })
    },
    [
      state.phase,
      state.whoseTurn,
      flight,
      legalIds,
      emitPlay,
      fxPrefs,
      startFlight,
      flightMs,
      you,
      online,
    ],
  )

  const showLastTrickOnTable =
    (state.phase === 'trick_reveal' ||
      (state.phase === 'hand_result' && peekFinalTrick)) &&
    state.lastTrick
  const trickPlays = showLastTrickOnTable ? state.lastTrick!.plays : state.currentTrick
  const trickReveal =
    state.phase === 'trick_reveal' || (state.phase === 'hand_result' && peekFinalTrick)

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.players[you].hand.length === 0) {
      setPeekFinalTrick(true)
      return
    }
    if (state.phase === 'hand_result') {
      setPeekFinalTrick(true)
      const t = window.setTimeout(() => setPeekFinalTrick(false), 500)
      return () => window.clearTimeout(t)
    }
    setPeekFinalTrick(false)
  }, [state.phase, state.handNumber, state.players, you])

  const showTrumpCorner =
    state.trump != null &&
    state.phase !== 'bidding' &&
    state.phase !== 'idle' &&
    state.phase !== 'game_over'
  const trumpIsRed = state.trump === 'hearts' || state.trump === 'diamonds'
  const yourTeamId = online ? partnershipOf(you) : humanPartnershipTeam(pp)
  const goalItems: GoalHudItem[] = useMemo(() => {
    if (
      state.phase !== 'playing' &&
      state.phase !== 'trick_reveal' &&
      state.phase !== 'discard' &&
      state.phase !== 'loner_choice'
    ) {
      return []
    }
    const nsTricks = state.players[0].tricksWon + state.players[2].tricksWon
    const ewTricks = state.players[1].tricksWon + state.players[3].tricksWon
    const makers = state.makerTeam
    const usTricks = yourTeamId === 'ns' ? nsTricks : ewTricks
    const themTricks = yourTeamId === 'ns' ? ewTricks : nsTricks
    const items: GoalHudItem[] = [
      {
        id: 'us',
        label: 'Us',
        value: `${usTricks}`,
        tone: makers === yourTeamId && usTricks >= 3 ? 'good' : 'default',
      },
      { id: 'them', label: 'Them', value: `${themTricks}` },
    ]
    if (makers) {
      const mTricks = makers === 'ns' ? nsTricks : ewTricks
      items.push({
        id: 'goal',
        label: makers === yourTeamId ? 'Make' : 'Set them',
        value: makers === yourTeamId ? `${mTricks}/3` : `${3 - mTricks} more`,
        tone: makers === yourTeamId ? 'hot' : 'warn',
      })
    }
    if (state.loner) {
      items.push({ id: 'loner', label: 'Loner', value: 'ON', tone: 'hot' })
    }
    return items
  }, [state.phase, state.players, state.makerTeam, state.loner, yourTeamId])
  const pickedUpHighlight = useMemo(
    () =>
      state.pickedUpCard && yourDiscard
        ? new Set([state.pickedUpCard.id])
        : undefined,
    [state.pickedUpCard, yourDiscard],
  )
  const kittyLockedIds = useMemo(
    () =>
      yourDiscard && state.pickedUpCard ? new Set([state.pickedUpCard.id]) : undefined,
    [yourDiscard, state.pickedUpCard],
  )
  const yourHand = useMemo(
    () =>
      sortEuchreHand(state.players[you].hand, state.trump).filter(
        (c) => c.id !== pendingOnlineId,
      ),
    [state.players, you, state.trump, pendingOnlineId],
  )

  useEffect(() => {
    const hand = state.players[you].hand
    if (pendingOnlineId && !hand.some((c) => c.id === pendingOnlineId)) {
      setPendingOnlineId(null)
    }
  }, [state.players, you, pendingOnlineId])
  const youSittingOut = Boolean(state.loner && state.sittingOut === you)

  useEffect(() => {
    if (youSittingOut && !lonerSlideSeen.current) {
      lonerSlideSeen.current = true
      setLonerSlide(true)
      const t = window.setTimeout(() => setLonerSlide(false), 1400)
      return () => window.clearTimeout(t)
    }
    if (!state.loner) {
      lonerSlideSeen.current = false
      setLonerSlide(false)
    }
  }, [youSittingOut, state.loner])
  const showKitty =
    state.phase === 'bidding' &&
    !state.awaitingTrumpAck &&
    (state.upcard != null || state.kitty.length > 0 || state.biddingRound === 2)
  const kittyStack =
    state.kitty.length > 0
      ? state.kitty
      : state.upcard
        ? [
            { id: 'kitty-down-0', suit: 'spades' as const, rank: '9' as const },
            { id: 'kitty-down-1', suit: 'spades' as const, rank: '9' as const },
            { id: 'kitty-down-2', suit: 'spades' as const, rank: '9' as const },
            state.upcard,
          ]
        : [
            { id: 'kitty-down-0', suit: 'spades' as const, rank: '9' as const },
            { id: 'kitty-down-1', suit: 'spades' as const, rank: '9' as const },
            { id: 'kitty-down-2', suit: 'spades' as const, rank: '9' as const },
            { id: 'kitty-down-3', suit: 'spades' as const, rank: '9' as const },
          ]
  const showBidPanels =
    (yourBidTurn || yourDiscard || yourLonerChoice) && !state.awaitingTrumpAck
  const lonerAllowed =
    state.makerTeam == null
      ? true
      : !lonerBlockedNearWin(state.makerTeam, state.teamScores, state.rules.raceTo)

  return (
    <div
      className={[
        'table-screen',
        'table-screen--euchre',
        `table-screen--felt-${feltStyle}`,
        dealing ? 'table-screen--dealing' : '',
        state.phase === 'bidding' || yourDiscard || yourLonerChoice
          ? 'table-screen--euchre-bid'
          : '',
        yourTurn || yourBidTurn || yourDiscard || yourLonerChoice
          ? 'table-screen--your-turn'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-felt={feltStyle}
    >
      <TableHeader
        gameLabel="Euchre"
        gameIcon="♦"
        handNumber={state.handNumber}
        raceTo={state.rules.raceTo}
        metaExtra={
          state.loner
            ? 'Loner'
            : state.trump
              ? 'Playing'
              : 'Bidding'
        }
        onOpenMenu={() => setShowMenu(true)}
        onOpenScores={() => setShowScores(true)}
        onOpenLastTrick={() => setShowLast(true)}
        onSettings={onSettings}
      />

      <div className="table-grid">
        <GoalHud items={goalItems} ariaLabel="Euchre hand goals" />
        {showTrumpCorner && state.trump && (
          <div
            className={[
              'euchre-trump-corner',
              trumpIsRed ? 'euchre-trump-corner--red' : 'euchre-trump-corner--black',
            ].join(' ')}
            aria-label={`Trump is ${state.trump}${
              state.maker != null ? `, ordered by ${state.players[state.maker].name}` : ''
            }`}
            title={
              state.maker != null
                ? `Trump ${state.trump} · ${state.players[state.maker].name} ordered`
                : `Trump ${state.trump}`
            }
          >
            <span className="euchre-trump-corner__label">Trump</span>
            <span className="euchre-trump-corner__suit" aria-hidden>
              {SUIT_SYMBOL[state.trump]}
            </span>
          </div>
        )}
        <div className="table-grid__north">
          <PlayerSeat
            player={seats[northSeat]}
            position="north"
            isTurn={state.whoseTurn === northSeat}
            thinking={
              online &&
              state.whoseTurn === northSeat &&
              !state.players[northSeat].isHuman
            }
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === northSeat}
          />
        </div>
        <div className="table-grid__west">
          <PlayerSeat
            player={seats[westSeat]}
            position="west"
            isTurn={state.whoseTurn === westSeat}
            thinking={
              online &&
              state.whoseTurn === westSeat &&
              !state.players[westSeat].isHuman
            }
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === westSeat}
          />
        </div>
        <div className="table-grid__center">
          {showKitty && (
            <div
              className={[
                'euchre-kitty',
                'euchre-kitty--center-stage',
                state.upcard ? 'euchre-kitty--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label="Kitty"
            >
              <span className="euchre-kitty__label">
                {state.upcard ? 'Kitty — order this suit?' : 'Kitty — turned down'}
              </span>
              <div className="euchre-kitty__stack">
                {kittyStack.map((card, i) => {
                  const isTop = i === kittyStack.length - 1
                  const faceUp = isTop && Boolean(state.upcard)
                  return (
                    <div
                      key={card.id}
                      className={[
                        'euchre-kitty__card',
                        faceUp ? 'euchre-kitty__card--up' : 'euchre-kitty__card--down',
                      ].join(' ')}
                      style={{ '--kitty-i': i } as CSSProperties}
                    >
                      {faceUp && state.upcard ? (
                        <CardView card={state.upcard} size="trick" />
                      ) : (
                        <CardView card={card} size="trick" faceDown />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <EuchreDramaBanners
            drama={drama === 'trump' ? drama : null}
            message={drama === 'trump' ? dramaMsg : null}
            subtitle={drama === 'trump' ? dramaSub : null}
            centered
          />
          {state.phase !== 'bidding' && (
            <TrickArea
              plays={toScreenPlays(trickPlays)}
              playerNames={screenPlayerNames}
              reveal={trickReveal}
              hiddenCardIds={inFlightIds}
              holdMs={pace.holdMs}
              resolveWinner={resolveWinner}
            />
          )}
          {statusText && state.phase !== 'bidding' && !yourDiscard && !yourLonerChoice && (
            <p
              className={[
                'spades-status',
                yourTurn ? 'spades-status--turn' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="status"
            >
              {statusText}
            </p>
          )}
        </div>
        <div className="table-grid__east">
          <PlayerSeat
            player={seats[eastSeat]}
            position="east"
            isTurn={state.whoseTurn === eastSeat}
            thinking={
              online &&
              state.whoseTurn === eastSeat &&
              !state.players[eastSeat].isHuman
            }
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === eastSeat}
          />
        </div>
        <div className="table-grid__south">
          {statusText &&
            (state.phase === 'bidding' || yourDiscard || yourLonerChoice) &&
            !showBidPanels && (
              <p className="euchre-bid-note" role="status">
                {statusText}
              </p>
            )}
          <EuchrePlayerHud
            state={state}
            yourSeat={you}
            active={yourTurn || yourBidTurn || yourDiscard || yourLonerChoice}
          />
          {!online && canUndo && onUndoPlay && yourTurn && (
            <button
              type="button"
              className="undo-play-btn"
              onClick={onUndoPlay}
              aria-label="Undo last card"
            >
              Undo card
            </button>
          )}
          {yourTurn && (
            <div className="your-turn-banner your-turn-banner--below-hud" role="status">
              Your turn
            </div>
          )}
        </div>
      </div>

      {passAndPlay &&
        state.awaitingDiscardAck &&
        state.trump &&
        state.maker != null && (
          <EuchreDiscardRecap
            dealerName={state.players[state.dealer].name}
            makerName={state.players[state.maker].name}
            trump={state.trump}
            onContinue={onAckDiscardComplete}
          />
        )}

      {passAndPlay &&
        state.awaitingLonerAck &&
        state.maker != null &&
        state.phase === 'playing' && (
          <EuchreLonerRecap
            makerName={state.players[state.maker].name}
            partnerName={
              state.loner && state.sittingOut != null
                ? state.players[state.sittingOut].name
                : state.players[partnerOf(state.maker)].name
            }
            alone={state.loner}
            onContinue={onAckLonerChoice}
          />
        )}

      {state.awaitingTrumpAck &&
        state.trump &&
        state.maker != null &&
        state.trumpCallMethod &&
        !skipRecaps && (
        <EuchreTrumpCallRecap
          makerName={state.players[state.maker].name}
          dealerName={state.players[state.dealer].name}
          trump={state.trump}
          method={state.trumpCallMethod}
          pickedUpCard={state.pickedUpCard}
          turnedDownSuit={state.turnedDownSuit}
          passAndPlay={passAndPlay}
          online={online}
          onContinue={onAckTrumpCall}
        />
      )}

      {showBidPanels && (
        <div className="euchre-table-stage">
          {yourLonerChoice && (
            <EuchreLonerPanel
              lonerAllowed={lonerAllowed}
              onGoAlone={emitGoAlone}
              onWithPartner={emitWithPartner}
            />
          )}
          {showBidPanels && yourBidTurn && (
            <EuchreTrumpPanel
              round={state.biddingRound}
              upcardSuit={state.upcard?.suit}
              turnedDown={state.turnedDownSuit}
              canOrder={state.biddingRound === 1}
              canName={state.biddingRound === 2}
              isDealer={state.dealer === you}
              onPass={emitPass}
              onOrderUp={emitOrderUp}
              onNameTrump={emitNameTrump}
            />
          )}
          {showBidPanels &&
            yourDiscard &&
            state.trump &&
            state.maker != null &&
            state.pickedUpCard && (
              <EuchreDiscardPanel
                makerName={state.players[state.maker].name}
                trump={state.trump}
                pickedUpCard={state.pickedUpCard}
              />
            )}
        </div>
      )}

      {lonerSlide && youSittingOut && (
        <div className="euchre-loner-slide" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="euchre-loner-slide__card"
              style={{ '--i': i } as CSSProperties}
            >
              <CardView
                card={{ id: `loner-out-${i}`, suit: 'spades', rank: '9' }}
                faceDown
                size="hand"
              />
            </div>
          ))}
        </div>
      )}

      <footer
        className={[
          'table-hand',
          yourTurn || yourDiscard ? 'table-hand--your-turn' : '',
          youSittingOut ? 'table-hand--sitting-out' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-seat-anchor={String(you)}
      >
        {!youSittingOut && (
          <Hand
            leftHandLayout={leftHandLayout}
            cards={yourHand}
            legalIds={yourTurn || yourDiscard ? legalIds : undefined}
            highlightIds={pickedUpHighlight}
            lockedIds={kittyLockedIds}
            interactive={yourTurn || yourDiscard}
            discardMode={yourDiscard}
            yourTurn={yourTurn || yourDiscard}
            flyingIds={inFlightIds}
            onCardClick={handleHandClick}
          />
        )}
      </footer>

      {(() => {
        const yourTeam = humanPartnershipTeam(pp)
        const summary = state.lastHandSummary
        // Hand-result drama only — never celebrate loner/stick announcements
        if (drama !== 'march' && drama !== 'euchre') return null
        if (!summary) return null

        const weWereMakers = summary.makerTeam === yourTeam
        const weGotEuchred = drama === 'euchre' && weWereMakers
        const theyMarchedOnUs = drama === 'march' && !weWereMakers
        const weMarched = drama === 'march' && weWereMakers
        const weEuchredThem = drama === 'euchre' && !weWereMakers

        // Set / euchred against you — sad rain only, never confetti
        if (weGotEuchred || theyMarchedOnUs) {
          return (
            <>
              <div className="drama-flash drama-flash--set" aria-hidden />
              <SetReaction />
            </>
          )
        }
        // March or euchre in your favor
        if (weMarched || weEuchredThem) {
          return (
            <>
              <div className="drama-flash drama-flash--queen" aria-hidden />
              <Confetti variant="win" count={88} intensity="epic" />
            </>
          )
        }
        return null
      })()}

      <EuchreDramaBanners
        drama={drama && drama !== 'trump' ? drama : null}
        message={drama && drama !== 'trump' ? dramaMsg : null}
        subtitle={drama && drama !== 'trump' ? dramaSub : null}
      />

      {flight && (
        <CardFlight
          key={flight.card.id}
          card={flight.card}
          from={flight.from}
          to={flight.to}
          size="hand"
          durationMs={flight.durationMs}
          onDone={finishFlight}
        />
      )}

      <Toast
        message={
          onlineWarning
            ? humorMode && /illegal|not a legal/i.test(onlineWarning)
              ? humorEuchreIllegal()
              : onlineWarning
            : state.warning && humorMode && /illegal|not a legal/i.test(state.warning)
              ? humorEuchreIllegal()
              : state.warning
        }
        tone="warn"
      />
      {!online && showPass && state.whoseTurn != null && (
        <PassDeviceBanner
          playerName={state.players[state.whoseTurn].name}
          onReady={acknowledge}
          mode={passDeviceMode}
        />
      )}
      <CoachTips
        open={coachOpen}
        onDone={() => setCoachOpen(false)}
        tips={gameCoachTips('euchre', pp)}
        gameId="euchre"
      />
      <EuchreScoreboard
        state={state}
        open={showScores}
        onClose={() => setShowScores(false)}
        yourTeam={yourTeamId}
      />
      <LastTrickModal
        open={showLast}
        trick={
          state.lastTrick
            ? { ...state.lastTrick, plays: toScreenPlays(state.lastTrick.plays) }
            : null
        }
        playerNames={screenPlayerNames}
        resolveWinner={resolveWinner}
        gameIcon="♦"
        gameLabel="Last trick"
        onClose={() => setShowLast(false)}
      />
      <AchievementToast
        achievement={achievementToast ?? null}
        soundEnabled={soundEnabled}
        hapticsEnabled={hapticsEnabled}
        onDone={() => onAchievementDone?.()}
      />
      <EuchreOverlay
        state={state}
        passPlay={pp}
        humorMode={humorMode}
        online={online}
        canRematch={canRematch}
        viewerSeat={you}
        onNextHand={onNextHand}
        onShowMatchResults={onShowMatchResults}
        onNewGame={onNewGame}
        onHome={onHome}
        onReviewLastTrick={() => setShowLast(true)}
      />

      <TableMenu
        open={showMenu}
        gameLabel="Euchre"
        gameIcon="♦"
        onClose={() => setShowMenu(false)}
        onSettings={onSettings}
        onHome={onHome}
        onStartOver={onStartOver}
        onAbandon={onAbandon}
      />
    </div>
  )
}
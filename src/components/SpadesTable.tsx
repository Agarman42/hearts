import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SpadesState } from '../games/spades/engine'
import { teamLabel } from '../games/spades/labels'
import { trickWinner } from '../games/spades/rules'
import { sortSpadesHand } from '../games/spades/hand'
import { teamContractBids, teamHandResult } from '../games/spades/scoring'
import { Card, Seat } from '../core/types'
import { partnershipOf } from '../core/partnership'
import { seatViewsFromSpades } from '../games/tablePlayer'
import { PlayerSeat } from './PlayerSeat'
import { Hand } from './Hand'
import { TrickArea } from './TrickArea'
import { TableHeader } from './TableHeader'
import { TableMenu } from './TableMenu'
import { SpadesBidPanel, type BidChoice } from './SpadesBidPanel'
import { SpadesPlayerHud } from './SpadesPlayerHud'
import { SpadesScoreboard } from './SpadesScoreboard'
import { SpadesOverlay } from './SpadesOverlay'
import { SpadesDramaBanners, type SpadesBidRecap } from './SpadesDramaBanners'
import { LastTrickModal } from './LastTrickModal'
import { AchievementToast } from './AchievementToast'
import { Toast } from './Toast'
import { CoachTips } from './CoachTips'
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
  humorSpadesAiThinking,

  humorSpadesBidLocked,
  humorSpadesBroken,
  humorSpadesIllegal,

  humorSpadesTrickWin,
  humorSpadesYourTurn,
  humorActive,
  withHumor,
} from '../humor'

import {
  fxDeal,
  fxHandEnd,
  fxIllegal,
  fxNilMade,
  fxPlayCard,
  fxSpadesBroken,
  fxTrickWin,
  fxYourTurn,
} from '../fx'
import './Table.css'
import './SpadesTable.css'

interface Props {
  state: SpadesState
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
  onCardClick: (card: Card) => void
  onSubmitBid: (choice: BidChoice) => void
  onNextHand: () => void
  onShowMatchResults?: () => void
  onNewGame: () => void
  onHome: () => void
  onSettings: () => void
  onStartOver: () => void
  onAbandon: () => void
  achievementToast?: import('../hooks/useAchievementToast').ToastUnlock | null
  onAchievementDone?: () => void
}

interface FlightState {
  kind: 'play-ai' | 'play-in'
  card: Card
  from: FlightRect
  to: FlightRect
  durationMs: number
}

export function SpadesTable({
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
  onCardClick,
  onSubmitBid,
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
  const [inFlightIds, setInFlightIds] = useState<Set<string>>(() => new Set())
  const [dealing, setDealing] = useState(false)
  const [handRevealed, setHandRevealed] = useState(() => !state.rules.blindNil)
  const [drama, setDrama] = useState<'spades' | 'nil' | 'bids' | 'set' | 'bag' | null>(null)
  const [dramaMsg, setDramaMsg] = useState<string | null>(null)
  const [dramaSub, setDramaSub] = useState<string | null>(null)
  const [bidRecap, setBidRecap] = useState<SpadesBidRecap | null>(null)
  const [peekFinalTrick, setPeekFinalTrick] = useState(false)
  const [coachOpen, setCoachOpen] = useState(
    () => coachTipsEnabled && !hasSeenCoach('spades'),
  )
  const [bidToast, setBidToast] = useState<string | null>(null)
  const [peekToast, setPeekToast] = useState<string | null>(null)
  const prevTurn = useRef<Seat | null>(state.whoseTurn)
  const prevTrickLen = useRef(state.currentTrick.length)
  const prevSpadesBroken = useRef(state.spadesBroken)
  const prevPhase = useRef(state.phase)
  const dramaTimer = useRef<number | null>(null)
  const settledFlights = useRef(new Set<string>())
  const flightQueue = useRef<FlightState[]>([])
  const flightBusy = useRef(false)

  const seats = useMemo(() => seatViewsFromSpades(state.players), [state.players])
  const biddingPhase = state.phase === 'bidding'
  const bidTrackOrder = [2, 1, 3, 0] as const
  const pace = SPEED_TIMING[gameSpeed]
  const flightMs = pace.flightMs
  const fxPrefs = useMemo(() => ({ hapticsEnabled, soundEnabled }), [hapticsEnabled, soundEnabled])
  const legalIds = useMemo(() => new Set(legal.map((c) => c.id)), [legal])
  const pp = useMemo(() => ({ passAndPlay, humanSeats }), [passAndPlay, humanSeats])
  const you = useMemo(() => uiSeat(state, pp), [state.whoseTurn, pp])
  const yourTeam = useMemo(() => humanPartnershipTeam(pp), [pp])
  const prevHumanBid = useRef(state.bids[you])
  const { showPass, acknowledge, canAct } = usePassReady(state.whoseTurn, pp)
  const passDeviceMode = useMemo((): import('./PassDeviceBanner').PassDeviceMode => {
    if (state.phase === 'bidding') return 'bid'
    return 'turn'
  }, [state.phase])
  const humanTurn =
    state.whoseTurn != null && isHumanControlled(state.whoseTurn, pp) && canAct
  const yourTurn =
    humanTurn && state.phase === 'playing' && state.whoseTurn === you && !flight
  const humanBidTurn = humanTurn && state.phase === 'bidding' && state.whoseTurn === you
  const hideHand =
    humanBidTurn && state.rules.blindNil && !handRevealed && state.players[you].bid == null
  const yourHand = useMemo(
    () => sortSpadesHand(state.players[you].hand),
    [state.players, you],
  )

  useEffect(() => {
    setHandRevealed(!state.rules.blindNil)
  }, [state.handNumber, state.rules.blindNil])

  const fireDrama = useCallback(
    (
      kind: 'spades' | 'nil' | 'bids' | 'set' | 'bag',
      message: string,
      subtitle?: string,
      opts?: { persist?: boolean },
    ) => {
      if (dramaTimer.current != null) window.clearTimeout(dramaTimer.current)
      setDrama(kind)
      setDramaMsg(message)
      setDramaSub(subtitle ?? null)
      const persistBidRecap = opts?.persist === true && kind === 'bids'
      if (!persistBidRecap) {
        const ms =
          kind === 'nil' ? 2200 : kind === 'bids' ? 3200 : kind === 'bag' ? 2400 : 2000
        dramaTimer.current = window.setTimeout(() => {
          setDrama(null)
          setDramaMsg(null)
          setDramaSub(null)
          if (kind === 'bids') setBidRecap(null)
          dramaTimer.current = null
        }, ms)
      } else {
        dramaTimer.current = null
      }
    },
    [],
  )

  const dismissBidRecap = useCallback(() => {
    if (dramaTimer.current != null) window.clearTimeout(dramaTimer.current)
    dramaTimer.current = null
    setDrama(null)
    setDramaMsg(null)
    setDramaSub(null)
    setBidRecap(null)
  }, [])

  const playerNames = useMemo(() => {
    const names = {} as Record<Seat, string>
    for (const s of [0, 1, 2, 3] as Seat[]) names[s] = state.players[s].name
    return names
  }, [state.players])

  const resolveWinner = useCallback(
    (plays: Parameters<typeof trickWinner>[0]) => trickWinner(plays, state.spadesBroken),
    [state.spadesBroken],
  )

  const showLastTrickOnTable =
    (state.phase === 'trick_reveal' ||
      (state.phase === 'hand_result' && peekFinalTrick)) &&
    state.lastTrick
  const trickPlays = showLastTrickOnTable ? state.lastTrick!.plays : state.currentTrick
  const trickReveal =
    state.phase === 'trick_reveal' || (state.phase === 'hand_result' && peekFinalTrick)

  useEffect(() => {
    if (state.phase === 'trick_reveal' && state.players[0].hand.length === 0) {
      setPeekFinalTrick(true)
      return
    }
    if (state.phase === 'hand_result') {
      setPeekFinalTrick(true)
      const t = window.setTimeout(() => setPeekFinalTrick(false), 500)
      return () => window.clearTimeout(t)
    }
    setPeekFinalTrick(false)
  }, [state.phase, state.handNumber])

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
  }, [state.whoseTurn, state.phase, fxPrefs])

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
      onCardClick(current.card)
    }
    const queued = flightQueue.current.shift()
    if (queued) startFlight(queued)
    else flightBusy.current = false
  }, [flight, onCardClick, startFlight])

  /** AI play flights — queued so fast speed never drops a card mid-air. */
  useLayoutEffect(() => {
    if (state.phase !== 'playing') return

    const plays = state.currentTrick
    if (plays.length === 0) return

    for (const p of plays) {
      if (isHumanControlled(p.seat, pp)) continue
      if (settledFlights.current.has(p.card.id)) continue
      if (inFlightIds.has(p.card.id)) continue

      settledFlights.current.add(p.card.id)

      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
      const from = seatOriginRect(p.seat)
      if (!from) continue
      const to = felt
        ? trickSeatRect(felt, p.seat, p.card.id)
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
  }, [state.phase, state.currentTrick, inFlightIds, enqueueOrStart, flightMs, pp])

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
    if (state.phase === 'trick_reveal' && state.lastTrick) {
      fxTrickWin(fxPrefs)
    }
  }, [state.phase, state.lastTrick, fxPrefs])

  useEffect(() => {
    if (state.spadesBroken && !prevSpadesBroken.current) {
      fireDrama(
        'spades',
        humorMode && humorActive() ? humorSpadesBroken() : '♠ Spades are broken!',
      )
      fxSpadesBroken(fxPrefs)
    }
    prevSpadesBroken.current = state.spadesBroken
  }, [state.spadesBroken, fireDrama, fxPrefs, humorMode])

  useEffect(() => {
    const prev = prevPhase.current

    if (state.phase === 'playing' && prev === 'bidding') {
      const totals = teamContractBids(state.bids)
      const table = totals.ns + totals.ew
      const recap: SpadesBidRecap = {
        tableBooks: table,
        teams: totals,
        players: ([0, 2, 1, 3] as Seat[]).map((seat) => {
          const bid = state.bids[seat]
          const label = bid
            ? bid.blindNil
              ? 'B∅'
              : bid.nil
                ? 'Nil'
                : String(bid.bid)
            : '—'
          return {
            seat,
            name: state.players[seat].name,
            label,
            team: partnershipOf(seat),
            isPartner: partnershipOf(seat) === yourTeam,
            isDealer: state.dealer === seat,
          }
        }),
      }
      setBidRecap(recap)
      fireDrama(
        'bids',
        `${teamLabel('ns')} ${totals.ns} · ${teamLabel('ew')} ${totals.ew}`,
        `${table} book${table === 1 ? '' : 's'} on the table`,
        passAndPlay ? { persist: true } : undefined,
      )
    }

    if (
      (state.phase === 'hand_result' || state.phase === 'game_over') &&
      prev !== 'hand_result' &&
      prev !== 'game_over'
    ) {
      fxHandEnd(fxPrefs)
      if (passAndPlay && state.phase === 'hand_result') {
        prevPhase.current = state.phase
        return
      }
      const summary = state.lastHandSummary
      const humanBid = state.bids[you]
      if (humanBid?.nil) {
        if (state.players[you].tricksWon === 0) {
          const label = humanBid.blindNil ? 'Blind nil made!' : 'Nil made!'
          fireDrama('nil', label)
          fxNilMade(fxPrefs)
        } else {
          const label = humanBid.blindNil ? 'Blind nil failed!' : 'Nil failed!'
          fireDrama('nil', label)
        }
      }
      if (summary) {
        const teamDetail = summary.teams[yourTeam]
        if (teamHandResult(yourTeam, summary) === 'set') {
          fireDrama(
            'set',
            humorMode ? 'Set — contract missed' : `${teamLabel(yourTeam)} set`,
            `${teamDetail.tricksTaken} of ${teamDetail.teamBid} books`,
          )
        }
        if (teamDetail.bagPenalty > 0) {
          fireDrama(
            'bag',
            humorMode ? 'Bag penalty!' : 'Ten bags — 100 off the board',
            `${teamDetail.bagPenalty} points`,
          )
        } else if (teamDetail.bagsAdded >= 3) {
          fireDrama(
            'bag',
            humorMode ? 'Sandbags piling up' : `+${teamDetail.bagsAdded} bags`,
            `${summary.bagsAfter[yourTeam]} total`,
          )
        }
      }
    }
    prevPhase.current = state.phase
  }, [
    state.phase,
    state.bids,
    state.players,
    state.dealer,
    state.lastHandSummary,
    fxPrefs,
    fireDrama,
    humorMode,
    passAndPlay,
    you,
    yourTeam,
  ])

  useEffect(() => {
    const cur = state.bids[you]
    const hadBid = prevHumanBid.current != null
    if (!hadBid && cur != null && state.phase === 'bidding') {
      setBidToast(withHumor('Bid locked in', humorSpadesBidLocked, humorMode))
      const t = window.setTimeout(() => setBidToast(null), 2200)
      prevHumanBid.current = cur
      return () => window.clearTimeout(t)
    }
    prevHumanBid.current = cur
  }, [state.bids, state.phase, humorMode, you])

  useEffect(() => {
    prevHumanBid.current = undefined
  }, [state.handNumber])

  useEffect(() => {
    if (state.warning) {
      if (/illegal|not a legal/i.test(state.warning)) fxIllegal(fxPrefs)
    }
  }, [state.warning, fxPrefs])

  const statusText = useMemo(() => {
    if (state.phase === 'bidding') {
      if (humanBidTurn) {
        if (hideHand) return 'Cards face-down — look at your cards or bid blind nil'
        return humorMode ? 'Your bid — partner is sweating' : 'Your bid'
      }
      const seat = state.whoseTurn
      if (seat != null) {
        return humorMode
          ? humorSpadesAiThinking(state.players[seat].name)
          : `${state.players[seat].name} is bidding…`
      }
      return 'Bidding'
    }
    if (state.phase === 'trick_reveal' && state.message && humorMode) {
      const nameMatch = state.message.match(/^(.+?)\s+wins/)
      if (nameMatch) return humorSpadesTrickWin(nameMatch[1])
    }
    if (state.message && state.phase !== 'trick_reveal') return state.message
    if (yourTurn) return withHumor('Your turn', humorSpadesYourTurn, humorMode)
    if (state.whoseTurn != null) {
      const p = state.players[state.whoseTurn]
      return withHumor(`${p.name} is thinking…`, () => humorSpadesAiThinking(p.name), humorMode)
    }
    return null
  }, [state, humanBidTurn, yourTurn, hideHand, humorMode])

  const handleHandClick = useCallback(
    (card: Card, el: HTMLElement) => {
      if (state.phase !== 'playing' || state.whoseTurn !== you) return
      if (flightBusy.current || flight) return
      if (legalIds.size > 0 && !legalIds.has(card.id)) {
        onCardClick(card)
        return
      }
      const felt = document.querySelector('[data-trick-felt]') as HTMLElement | null
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
      onCardClick,
      fxPrefs,
      startFlight,
      flightMs,
      you,
    ],
  )

  const partnerSeat = ((you + 2) % 4) as Seat

  return (
    <div
      className={[
        'table-screen',
        'table-screen--spades',
        dealing ? 'table-screen--dealing' : '',
        humanBidTurn ? 'table-screen--bidding' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-felt={feltStyle}
    >
      <TableHeader
        gameLabel="Spades"
        gameIcon="♠"
        handNumber={state.handNumber}
        raceTo={state.rules.raceTo}
        metaExtra={state.spadesBroken ? '♠ broken' : '♠ unbroken'}
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
            isDealer={state.dealer === 2}
            biddingPhase={biddingPhase}
          />
        </div>
        <div className="table-grid__west">
          <PlayerSeat
            player={seats[1]}
            position="west"
            isTurn={state.whoseTurn === 1}
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === 1}
            biddingPhase={biddingPhase}
          />
        </div>
        <div className="table-grid__center table-grid__center--spades">
          <SpadesDramaBanners
            drama={drama === 'bids' ? drama : null}
            message={drama === 'bids' ? dramaMsg : null}
            subtitle={drama === 'bids' ? dramaSub : null}
            bidRecap={drama === 'bids' ? bidRecap : null}
            onDismiss={passAndPlay && drama === 'bids' ? dismissBidRecap : undefined}
            centered
          />
          <TrickArea
            plays={trickPlays}
            playerNames={playerNames}
            reveal={trickReveal}
            hiddenCardIds={inFlightIds}
            holdMs={pace.holdMs}
            resolveWinner={resolveWinner}
          />
          {biddingPhase && (
            <div className="spades-bid-track" aria-label="Bids this hand">
              {bidTrackOrder.map((seat) => {
                const bid = state.bids[seat]
                const isDealer = state.dealer === seat
                const biddingNow = state.whoseTurn === seat && bid == null
                const bidDone = bid != null
                const label = bidDone
                  ? bid.blindNil
                    ? 'B∅'
                    : bid.nil
                      ? '∅'
                      : String(bid.bid)
                  : biddingNow
                    ? '…'
                    : '—'
                const status = bidDone
                  ? 'Bid in'
                  : biddingNow
                    ? 'Bidding'
                    : 'Waiting'
                return (
                  <div
                    key={seat}
                    className={[
                      'spades-bid-track__cell',
                      bidDone ? 'is-done' : '',
                      biddingNow ? 'is-active' : '',
                      !bidDone && !biddingNow ? 'is-waiting' : '',
                      isDealer ? 'is-dealer' : '',
                      partnershipOf(seat) === yourTeam ? 'is-partner' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="spades-bid-track__name">
                      {isDealer && <span className="spades-bid-track__dealer">D</span>}
                      {state.players[seat].name}
                    </span>
                    <span className="spades-bid-track__val">{label}</span>
                    <span className="spades-bid-track__status">{status}</span>
                  </div>
                )
              })}
            </div>
          )}
          {statusText && (
            <p
              className={[
                'spades-status',
                yourTurn || humanBidTurn ? 'spades-status--turn' : '',
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
            player={seats[3]}
            position="east"
            isTurn={state.whoseTurn === 3}
            raceTo={state.rules.raceTo}
            isDealer={state.dealer === 3}
            biddingPhase={biddingPhase}
          />
        </div>

        <div className="table-grid__south">
          {(state.phase === 'bidding' ||
            state.phase === 'playing' ||
            state.phase === 'trick_reveal') && (
            <SpadesPlayerHud
              player={seats[you]}
              partner={seats[partnerSeat]}
              teamBags={state.teamBags[yourTeam]}
              bagsPerPenalty={state.rules.bagsPerPenalty}
              active={yourTurn || humanBidTurn}
              isDealer={state.dealer === you}
              biddingPhase={biddingPhase}
              yourBidTurn={humanBidTurn}
            />
          )}
        </div>
      </div>

      {humanBidTurn && (
        <div className="spades-bid-stage">
          <SpadesBidPanel
            key={state.handNumber}
            nilAllowed={state.rules.nilBids}
            blindNilAllowed={state.rules.blindNil}
            handRevealed={handRevealed}
            partnerName={state.players[partnerSeat].name}
            bidderName={state.players[you].name}
            passAndPlay={passAndPlay}
            onPeek={() => {
              setHandRevealed(true)
              const bidder = state.players[you].name
              setPeekToast(
                passAndPlay
                  ? `${bidder} peeked — blind nil is closed`
                  : 'Cards revealed — blind nil is no longer available',
              )
              window.setTimeout(() => setPeekToast(null), 2800)
            }}
            onSubmit={onSubmitBid}
          />
        </div>
      )}

      <footer
        className={[
          'table-hand',
          yourTurn || (humanBidTurn && !hideHand) ? 'table-hand--your-turn' : '',
          hideHand ? 'spades-hand--concealed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-seat-anchor={String(you)}
        style={{ position: 'relative' }}
      >
        <Hand
          leftHandLayout={leftHandLayout}
          cards={yourHand}
          legalIds={yourTurn ? legalIds : undefined}
          interactive={yourTurn && !flight}
          concealed={hideHand}
          yourTurn={yourTurn || (humanBidTurn && !hideHand)}
          flyingIds={inFlightIds}
          onCardClick={handleHandClick}
        />
        {hideHand && (
          <div className="spades-blind-veil" aria-hidden>
            <span className="spades-blind-veil__icon">🂠</span>
            <span className="spades-blind-veil__text">
              {passAndPlay
                ? `${state.players[you].name} — cards face-down. Peek from the bid panel.`
                : 'Cards face-down — peek from the bid panel above'}
            </span>
          </div>
        )}
      </footer>

      <SpadesDramaBanners
        drama={drama && drama !== 'bids' ? drama : null}
        message={drama && drama !== 'bids' ? dramaMsg : null}
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
          state.warning && humorMode && /illegal|not a legal/i.test(state.warning)
            ? humorSpadesIllegal()
            : state.warning
        }
        tone="warn"
      />
      <Toast message={bidToast} tone="info" />
      <Toast message={peekToast} tone="info" />
      {showPass && state.whoseTurn != null && (
        <PassDeviceBanner
          playerName={state.players[state.whoseTurn].name}
          onReady={acknowledge}
          mode={passDeviceMode}
        />
      )}
      <CoachTips
        open={coachOpen}
        onDone={() => setCoachOpen(false)}
        tips={gameCoachTips('spades', pp)}
        gameId="spades"
      />
      <SpadesScoreboard state={state} open={showScores} onClose={() => setShowScores(false)} />
      <LastTrickModal
        open={showLast}
        trick={state.lastTrick}
        playerNames={playerNames}
        resolveWinner={resolveWinner}
        gameIcon="♠"
        gameLabel="Last trick"
        onClose={() => setShowLast(false)}
      />
      <AchievementToast
        achievement={achievementToast ?? null}
        soundEnabled={soundEnabled}
        hapticsEnabled={hapticsEnabled}
        onDone={() => onAchievementDone?.()}
      />
      <SpadesOverlay
        state={state}
        passPlay={pp}
        humorMode={humorMode}
        onNextHand={onNextHand}
        onShowMatchResults={onShowMatchResults}
        onNewGame={onNewGame}
        onHome={onHome}
        onReviewLastTrick={() => setShowLast(true)}
      />
      <TableMenu
        open={showMenu}
        gameLabel="Spades"
        gameIcon="♠"
        onClose={() => setShowMenu(false)}
        onSettings={onSettings}
        onHome={onHome}
        onStartOver={onStartOver}
        onAbandon={onAbandon}
      />
    </div>
  )
}
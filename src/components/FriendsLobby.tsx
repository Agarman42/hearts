import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Seat } from '../core/types'
import { SEATS } from '../core/types'
import { gameMeta, type GameId } from '../games/registry'
import { getLegalForHuman as getLegalHearts } from '../games/hearts/engine'
import { getLegalForHuman as getLegalSpades } from '../games/spades/engine'
import { getLegalForHuman as getLegalEuchre } from '../games/euchre/engine'
import { canStart } from '../multiplayer/lobby'
import { screenSlot, seatOfPlayer } from '../multiplayer/seats'
import { previewChairName } from '../multiplayer/identity'
import { useOnlineGame } from '../hooks/useOnlineGame'
import { createRoomOnce, emptyCreateRoomCache, postCreateRoom } from '../multiplayer/createRoom'
import { clearLastFriendsRoom, isStandaloneDisplay, saveLastFriendsRoom } from '../multiplayer/lastRoom'
import { formatRoomRules, snapshotRoomRules } from '../multiplayer/roomRules'
import type { RoomRulesSnapshot } from '../multiplayer/protocol'
import { ensureTurnNotifications, useYourTurnNudge } from '../hooks/useYourTurnNudge'

import type { LobbyOccupant } from '../multiplayer/protocol'
import type { GameSpeed } from '../prefs'
import { ConnectionBanner } from './ConnectionBanner'
import { EuchreTable } from './EuchreTable'
import { SpadesTable } from './SpadesTable'
import { Table } from './Table'
import './FriendsLobby.css'

type ChairPos = 'north' | 'west' | 'east' | 'south'

const SLOT_POS: Record<Seat, ChairPos> = {
  0: 'south',
  1: 'west',
  2: 'north',
  3: 'east',
}

interface Props {
  wsUrl: string
  gameId: GameId
  name: string
  initialCode?: string | null
  onLeave: () => void
  feltStyle?: string
  hapticsEnabled?: boolean
  soundEnabled?: boolean
  humorMode?: boolean
  leftHandLayout?: boolean
  gameSpeed?: GameSpeed
  coachTipsEnabled?: boolean
  skipRecaps?: boolean
  onLobbyGame?: (gameId: GameId) => void
  onSettings?: () => void
  onDisplayName?: (name: string) => void
  houseRules?: RoomRulesSnapshot
}

function readUrlRoom(): string | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('room')
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  return code.length >= 4 ? code.slice(0, 4) : null
}

function writeRoomToUrl(code: string, gameId: GameId): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('room', code)
  url.searchParams.set('game', gameId)
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function clearRoomFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  url.searchParams.delete('game')
  const q = url.searchParams.toString()
  window.history.replaceState({}, '', `${url.pathname}${q ? `?${q}` : ''}${url.hash}`)
}

function shareUrl(code: string, gameId: GameId): string {
  const path = typeof window === 'undefined' ? '/' : window.location.pathname
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${path}?room=${code}&game=${gameId}`
}

function LobbyChairName({
  name,
  empty,
  isYou,
  host,
  away,
  onCommit,
}: {
  name: string
  empty: boolean
  isYou: boolean
  host?: boolean
  away?: boolean
  onCommit: (name: string) => void
}) {
  const [draft, setDraft] = useState(name)
  useEffect(() => {
    setDraft(name)
  }, [name])
  return (
    <label className="friends-lobby__name-edit">
      <input
        className="friends-lobby__chair-input"
        value={draft}
        maxLength={16}
        aria-label={empty ? `Name the ${name} seat` : `Rename ${name}`}
        placeholder={empty ? 'AI name' : 'Name'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim()
          if (!next) {
            setDraft(name)
            return
          }
          if (next !== name) onCommit(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <span className="friends-lobby__chair-tags">
        {isYou ? 'You' : empty ? 'AI' : ''}
        {host ? ' · host' : ''}
        {away ? ' · away' : ''}
      </span>
    </label>
  )
}

export function FriendsLobby({
  wsUrl,
  gameId,
  name,
  initialCode = null,
  onLeave,
  feltStyle = 'green',
  hapticsEnabled = true,
  soundEnabled = false,
  humorMode = false,
  leftHandLayout = false,
  gameSpeed = 'fast',
  coachTipsEnabled = true,
  skipRecaps = false,
  onLobbyGame,
  onSettings,
  onDisplayName,
  houseRules,
}: Props) {
  const [nameDraft, setNameDraft] = useState(name === 'You' ? '' : name)
  const [nameReady, setNameReady] = useState(() => Boolean(name.trim()) && name.trim() !== 'You')
  const [code, setCode] = useState<string | null>(() => initialCode ?? readUrlRoom())
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const createCache = useRef(emptyCreateRoomCache())

  useEffect(() => {
    if (!nameReady) return
    if (code) {
      writeRoomToUrl(code, gameId)
      return
    }
    let cancelled = false
    setCreating(true)
    setCreateError(null)
    createRoomOnce(createCache.current, () =>
      postCreateRoom(wsUrl, gameId, name, houseRules ?? snapshotRoomRules(gameId, {})),
    )
      .then((next) => {
        if (cancelled) return
        setCode(next.code)
        writeRoomToUrl(next.code, gameId)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCreateError(err instanceof Error ? err.message : 'Could not create room.')
      })
      .finally(() => {
        if (!cancelled) setCreating(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, gameId, name, wsUrl, houseRules, nameReady])

  const retryCreate = useCallback(() => {
    createCache.current = emptyCreateRoomCache()
    setCreateError(null)
    setCode(null)
  }, [])

  const online = useOnlineGame({
    wsUrl,
    code: nameReady ? code : null,
    name: nameReady ? (name.trim() || nameDraft.trim()) : name,
    gameId,
  })
  const mySeat =
    seatOfPlayer(online.lobby?.chairs, online.playerId) ??
    online.view?.viewerSeat ??
    online.mySeat
  useYourTurnNudge(online.view, mySeat, {
    hapticsEnabled,
    soundEnabled,
  })
  const lobbyGame = online.lobby?.gameId
  useEffect(() => {
    if (lobbyGame && lobbyGame !== gameId) onLobbyGame?.(lobbyGame)
  }, [lobbyGame, gameId, onLobbyGame])
  const tableGame = lobbyGame ?? gameId
  const meta = gameMeta(tableGame)
  const hasPartners = meta.hasPartners

  useEffect(() => {
    if (code) saveLastFriendsRoom({ code, gameId: tableGame })
  }, [code, tableGame])

  const handleLeave = useCallback(() => {
    online.send({ type: 'leave' })
    clearLastFriendsRoom()
    clearRoomFromUrl()
    onLeave()
  }, [online, onLeave])

  const copyText = useCallback(async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }, [])

  const onCopyCode = useCallback(() => {
    if (code) void copyText(code, 'code')
  }, [code, copyText])

  const onShare = useCallback(async () => {
    if (!code) return
    const url = shareUrl(code, gameId)
    const share = navigator.share
    if (typeof share === 'function') {
      try {
        await share.call(navigator, {
          title: `${meta.title} with friends`,
          text: `Join my ${meta.title} table in Card Parlour. Code ${code} — open the home-screen app and tap Join with code, or use this link.`,
          url,
        })
        return
      } catch {
        /* fall through to copy */
      }
    }
    await copyText(url, 'link')
  }, [code, copyText, gameId, meta.title])

  const onSms = useCallback(() => {
    if (!code) return
    const url = shareUrl(code, gameId)
    const body = encodeURIComponent(`Join my ${meta.title} table. Code ${code} ${url}`)
    window.location.href = `sms:?&body=${body}`
  }, [code, gameId, meta.title])

  const myVote = online.playerId
    ? online.lobby?.fillAiVotes[online.playerId] === true
    : false
  const startReady = online.lobby ? canStart(online.lobby) : false
  const emptyCount = online.lobby
    ? SEATS.filter((s) => online.lobby!.chairs[s] == null).length
    : 0
  const humans = useMemo(() => {
    if (!online.lobby) return [] as LobbyOccupant[]
    return SEATS.map((s) => online.lobby!.chairs[s]).filter(
      (o): o is LobbyOccupant => o != null,
    )
  }, [online.lobby])
  const votesIncomplete = emptyCount > 0 && humans.length > 0 && !startReady
  const pendingForMe =
    online.lobby?.pendingSwap &&
    mySeat != null &&
    online.lobby.pendingSwap.toSeat === mySeat
      ? online.lobby.pendingSwap
      : null
  const isHost = online.playerId != null && online.playerId === online.lobby?.hostId
  const renameSeat = useCallback(
    (seat: Seat, next: string) => {
      const name = next.trim().slice(0, 16)
      if (!name) return
      online.send({ type: 'set_name', seat, name })
      if (seat === mySeat) onDisplayName?.(name)
    },
    [online, mySeat, onDisplayName],
  )
  const pausedSeat = online.paused?.seat
  const canReplace =
    online.connected &&
    online.paused != null &&
    online.playerId != null &&
    (pausedSeat == null || online.lobby?.chairs[pausedSeat]?.playerId !== online.playerId)
  const waitName = (() => {
    const view = online.view
    const seat = mySeat
    if (!view || seat == null || online.paused) return null
    const turn = view.state.whoseTurn
    if (turn == null || turn === seat) return null
    const phase = view.state.phase
    if (phase !== 'playing' && phase !== 'bidding' && phase !== 'discard' && phase !== 'loner_choice') {
      return null
    }
    return view.state.players[turn]?.name ?? null
  })()
  const banner = (
    <>
      <ConnectionBanner
        connected={online.connected || (online.lobby == null && online.view == null)}
        paused={online.paused}
        canReplace={canReplace && isHost}
        onReplace={() => online.send({ type: 'vote_replace_ai', approve: true })}
      />
      {online.lobby && !online.view && (
        <ul className="friends-lobby__rules friends-lobby__rules--bar" aria-label="House rules">
          {formatRoomRules(online.lobby.rules, tableGame).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </>
  )
  const onRematch = () => {
    if (isHost) online.send({ type: 'rematch' })
  }

  if (!nameReady) {
    return (
      <div className="friends-lobby">
        <div className="friends-lobby__vignette" aria-hidden />
        <main className="friends-lobby__stage">
          <form
            className="friends-lobby__name-gate"
            onSubmit={(e) => {
              e.preventDefault()
              const next = nameDraft.trim()
              if (!next) return
              onDisplayName?.(next)
              setNameReady(true)
            }}
          >
            <p className="friends-lobby__kicker">Friends table</p>
            <h1 className="friends-lobby__title">What should we call you?</h1>
            <input
              className="friends-lobby__name-input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
              placeholder="Your name"
              aria-label="Your name at the table"
            />
            <button type="submit" className="btn btn--primary btn--lg" disabled={!nameDraft.trim()}>
              Sit down
            </button>
          </form>
        </main>
      </div>
    )
  }

  const watching =
    online.view != null &&
    mySeat != null &&
    !online.view.state.players[mySeat].isHuman

  if (online.view?.gameId === 'hearts' && mySeat != null) {
    const view = online.view
    const noop = () => {}
    return (
      <>
      {banner}
      <Table
        state={view.state}
        legal={getLegalHearts(view.state, mySeat)}
        mySeat={mySeat}
        online
        canRematch={isHost}
        onOnlineAction={online.sendAction}
        feltStyle={feltStyle}
        hapticsEnabled={hapticsEnabled}
        soundEnabled={soundEnabled}
        humorMode={humorMode}
        leftHandLayout={leftHandLayout}
        gameSpeed={gameSpeed}
        coachTipsEnabled={coachTipsEnabled}
        skipRecaps={skipRecaps}
        roomCode={code}
        connected={online.connected}
        passAndPlay={false}
        humanSeats={{ 0: mySeat === 0, 1: mySeat === 1, 2: mySeat === 2, 3: mySeat === 3 }}
        onCardClick={noop}
        onConfirmPass={noop}
        onAcceptReceived={noop}
        onAckPassComplete={noop}
        onNextHand={noop}
        onNewGame={onRematch}
        onHome={handleLeave}
        onSettings={onSettings ?? noop}
        onStartOver={handleLeave}
        onAbandon={handleLeave}
        onlineWarning={online.error?.message ?? null}
      />
      {watching && (
        <p className="friends-lobby__watch" role="status">
          You’re watching — AI has this seat.
        </p>
      )}
      </>
    )
  }

  if (online.view?.gameId === 'spades' && mySeat != null) {
    const view = online.view
    const noop = () => {}
    return (
      <>
      {banner}
      <SpadesTable
        state={view.state}
        legal={getLegalSpades(view.state, mySeat)}
        mySeat={mySeat}
        online
        canRematch={isHost}
        onOnlineAction={online.sendAction}
        feltStyle={feltStyle}
        hapticsEnabled={hapticsEnabled}
        soundEnabled={soundEnabled}
        humorMode={humorMode}
        leftHandLayout={leftHandLayout}
        gameSpeed={gameSpeed}
        coachTipsEnabled={coachTipsEnabled}
        skipRecaps={skipRecaps}
        roomCode={code}
        connected={online.connected}
        passAndPlay={false}
        humanSeats={{ 0: mySeat === 0, 1: mySeat === 1, 2: mySeat === 2, 3: mySeat === 3 }}
        onCardClick={noop}
        onSubmitBid={noop}
        onNextHand={noop}
        onNewGame={onRematch}
        onHome={handleLeave}
        onSettings={onSettings ?? noop}
        onStartOver={handleLeave}
        onAbandon={handleLeave}
        onlineWarning={online.error?.message ?? null}
      />
      {watching && (
        <p className="friends-lobby__watch" role="status">
          You’re watching — AI has this seat.
        </p>
      )}
      </>
    )
  }

  if (online.view?.gameId === 'euchre' && mySeat != null) {
    const view = online.view
    const noop = () => {}
    return (
      <>
      {banner}
      <EuchreTable
        state={view.state}
        legal={getLegalEuchre(view.state, mySeat)}
        mySeat={mySeat}
        online
        canRematch={isHost}
        onOnlineAction={online.sendAction}
        feltStyle={feltStyle}
        hapticsEnabled={hapticsEnabled}
        soundEnabled={soundEnabled}
        humorMode={humorMode}
        leftHandLayout={leftHandLayout}
        gameSpeed={gameSpeed}
        coachTipsEnabled={coachTipsEnabled}
        skipRecaps={skipRecaps}
        roomCode={code}
        connected={online.connected}
        passAndPlay={false}
        humanSeats={{ 0: mySeat === 0, 1: mySeat === 1, 2: mySeat === 2, 3: mySeat === 3 }}
        onCardClick={noop}
        onPass={noop}
        onOrderUp={noop}
        onNameTrump={noop}
        onGoAlone={noop}
        onWithPartner={noop}
        onAckTrumpCall={noop}
        onAckLonerChoice={noop}
        onAckDiscardComplete={noop}
        onNextHand={noop}
        onNewGame={onRematch}
        onHome={handleLeave}
        onSettings={onSettings ?? noop}
        onStartOver={handleLeave}
        onAbandon={handleLeave}
        onlineWarning={online.error?.message ?? null}
        onRenameSeat={renameSeat}
      />
      {watching && (
        <p className="friends-lobby__watch" role="status">
          You’re watching — AI has this seat.
        </p>
      )}
      </>
    )
  }

  if (online.view) {
    return (
      <div className="friends-lobby">
        {banner}
        <div className="friends-lobby__vignette" aria-hidden />
        <main className="friends-lobby__stage">
          <div className="friends-lobby__starting" role="status">
            <p className="friends-lobby__kicker">{meta.title}</p>
            <h1 className="friends-lobby__title">Match starting…</h1>
            <p className="friends-lobby__sub">
              {waitName ? `Waiting on ${waitName}` : 'Cards hit the felt in a moment.'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="friends-lobby">
      {banner}
      <div className="friends-lobby__vignette" aria-hidden />
      <main className="friends-lobby__stage">
        <header className="friends-lobby__head">
          <button type="button" className="friends-lobby__back" onClick={handleLeave}>
            ← Leave
          </button>
          <div className="friends-lobby__brand">
            <p className="friends-lobby__kicker">Friends table</p>
            <h1 className="friends-lobby__title">{meta.title}</h1>
          </div>
          {onSettings && (
            <button type="button" className="friends-lobby__gear" onClick={onSettings}>
              Settings
            </button>
          )}
        </header>

        <section className="friends-lobby__code-card" aria-label="Room code">
          {code ? (
            <>
              <p className="friends-lobby__code-label">Room code</p>
              <p className="friends-lobby__code">{code}</p>
              <div className="friends-lobby__share-row">
                <button type="button" className="btn btn--ghost friends-lobby__share-btn" onClick={onCopyCode}>
                  {copied === 'code' ? 'Copied' : 'Copy'}
                </button>
                <button type="button" className="btn btn--ghost friends-lobby__share-btn" onClick={() => void onShare()}>
                  {copied === 'link' ? 'Link copied' : 'Share'}
                </button>
                <button type="button" className="btn btn--ghost friends-lobby__share-btn" onClick={onSms}>
                  SMS
                </button>
              </div>
            </>
          ) : creating ? (
            <p className="friends-lobby__status">Opening a table…</p>
          ) : createError ? (
            <div className="friends-lobby__error-block">
              <p className="friends-lobby__error" role="alert">
                {createError}
              </p>
              <div className="friends-lobby__share-row">
                <button type="button" className="btn btn--primary" onClick={retryCreate}>
                  Try again
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleLeave}>
                  Join a different table
                </button>
              </div>
            </div>
          ) : (
            <p className="friends-lobby__status">Joining…</p>
          )}
        </section>

        {code && !isStandaloneDisplay() && (
          <p className="friends-lobby__pwa-hint" role="note">
            Playing in the browser. To use the home-screen app, open Card Parlour and enter
            code <strong>{code}</strong>.
          </p>
        )}

        {(online.fatal || online.error) && (
          <div className="friends-lobby__error-block">
            <p className="friends-lobby__error" role="alert">
              {online.fatal ?? online.error?.message}
            </p>
            <div className="friends-lobby__share-row">
              <button type="button" className="btn btn--ghost" onClick={handleLeave}>
                Join a different table
              </button>
            </div>
          </div>
        )}

        {online.lobby && !online.view && (
          <ul className="friends-lobby__rules" aria-label="House rules">
            {formatRoomRules(online.lobby.rules, tableGame).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        <p className="friends-lobby__seat-hint">
          Tap a name to edit. After you partner up, You stays on your chair — empty seats keep
          their own names.
        </p>
        <div className="friends-lobby__felt" aria-label="Seats">
          {SEATS.map((engineSeat) => {
            const occupant = online.lobby?.chairs[engineSeat] ?? null
            const slot = screenSlot(engineSeat, mySeat ?? 0)
            const pos = SLOT_POS[slot]
            const preview = online.lobby
              ? previewChairName(occupant, engineSeat, online.playerId, online.lobby)
              : { name: 'Empty', isYou: false, empty: true }
            const isMe = preview.isYou
            const empty = preview.empty
            return (
              <div key={engineSeat} className={`friends-lobby__chair-wrap friends-lobby__chair-wrap--${pos}`}>
                <div
                  className={[
                    'friends-lobby__chair',
                    empty ? 'friends-lobby__chair--empty' : '',
                    isMe ? 'friends-lobby__chair--me' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {!empty && (
                    <span
                      className={[
                        'friends-lobby__dot',
                        occupant!.connected
                          ? 'friends-lobby__dot--on'
                          : 'friends-lobby__dot--away',
                      ].join(' ')}
                      aria-hidden
                    />
                  )}
                  <LobbyChairName
                    name={preview.name}
                    empty={empty}
                    isYou={isMe}
                    host={occupant?.playerId === online.lobby?.hostId}
                    away={occupant != null && !occupant.connected}
                    onCommit={(next) => renameSeat(engineSeat, next)}
                  />
                  <button
                    type="button"
                    className="friends-lobby__sit"
                    disabled={!online.lobby || (!empty && !isMe)}
                    onClick={() => {
                      if (!online.lobby) return
                      if (empty) online.send({ type: 'sit', seat: engineSeat })
                      else if (isMe) online.send({ type: 'stand' })
                    }}
                    aria-label={
                      empty
                        ? `Sit ${pos}`
                        : isMe
                          ? 'Stand up'
                          : `${preview.name} is seated`
                    }
                  >
                    {empty ? 'Sit' : isMe ? 'Stand' : pos}
                  </button>
                </div>
                {hasPartners && occupant && !isMe && (
                  <div className="friends-lobby__rel">
                    <button
                      type="button"
                      className="friends-lobby__rel-btn"
                      onClick={() =>
                        online.send({
                          type: 'sit_relative',
                          vsSeat: engineSeat,
                          relation: 'partner',
                        })
                      }
                    >
                      Be {occupant.name.split(' ')[0]}'s partner
                    </button>
                    <button
                      type="button"
                      className="friends-lobby__rel-btn"
                      onClick={() =>
                        online.send({
                          type: 'sit_relative',
                          vsSeat: engineSeat,
                          relation: 'opponent',
                        })
                      }
                    >
                      Sit against {occupant.name.split(' ')[0]}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {pendingForMe && (
          <div className="friends-lobby__swap" role="dialog" aria-label="Seat swap">
            <p>
              {online.lobby?.chairs[pendingForMe.fromSeat]?.name ?? 'Someone'} wants to swap
              seats.
            </p>
            <div className="friends-lobby__share-row">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => online.send({ type: 'swap_respond', accept: false })}
              >
                Decline
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => online.send({ type: 'swap_respond', accept: true })}
              >
                Accept
              </button>
            </div>
          </div>
        )}

        {online.lobby && hasPartners && online.mySeat != null && (
          <p className="friends-lobby__partner-line" role="status">
            You are South. Partner is North
            {online.lobby.chairs[((online.mySeat + 2) % 4) as Seat]?.name
              ? ` — ${online.lobby.chairs[((online.mySeat + 2) % 4) as Seat]!.name}`
              : ' — a bot will sit'}
            .
          </p>
        )}

        {votesIncomplete && (
          <p className="friends-lobby__waiting" role="status">
            Waiting for everyone to approve AI fill…
          </p>
        )}

        <div className="friends-lobby__actions">
          {emptyCount > 0 && (
            <button
              type="button"
              className={[
                'btn btn--ghost btn--lg',
                myVote ? 'friends-lobby__vote--on' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={!online.lobby || mySeat == null}
              onClick={() => online.send({ type: 'vote_fill_ai', approve: !myVote })}
            >
              {myVote ? 'AI fill approved' : 'Wait for friends · or fill bots'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary btn--lg"
            disabled={!startReady}
            onClick={() => {
              ensureTurnNotifications()
              if (emptyCount > 0 && !myVote) {
                online.send({ type: 'vote_fill_ai', approve: true })
              }
              online.send({ type: 'start' })
            }}
          >
            {emptyCount > 0 ? 'Deal now — fill empty seats with AI' : 'Deal now'}
          </button>
        </div>
      </main>
    </div>
  )
}

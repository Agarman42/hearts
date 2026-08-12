import { useCallback, useEffect, useRef, useState } from 'react'
import type { Seat } from '../core/types'
import type { GameId } from '../games/registry'
import { connectRoom, type RoomClient } from '../multiplayer/client'
import type {
  ClientMessage,
  GameAction,
  LobbyState,
  PausedInfo,
  ProjectedState,
  ServerMessage,
} from '../multiplayer/protocol'

export function wsHttpOrigin(wsUrl: string): string {
  return wsUrl.replace(/^ws/i, 'http')
}

export function roomWsUrl(wsUrl: string, code: string): string {
  const base = wsUrl.replace(/\/+$/, '')
  return `${base}/room/${code.toUpperCase()}`
}

export type UseOnlineGameOpts = {
  wsUrl: string
  code: string | null
  name: string
  gameId: GameId
}

export function useOnlineGame(opts: UseOnlineGameOpts) {
  const [lobby, setLobby] = useState<LobbyState | null>(null)
  const [view, setView] = useState<ProjectedState | null>(null)
  const [mySeat, setMySeat] = useState<Seat | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState<PausedInfo | null>(null)
  const [replaceAvailable, setReplaceAvailable] = useState<{
    seat: Seat
    name: string
  } | null>(null)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)
  const clientRef = useRef<RoomClient | null>(null)
  const seqRef = useRef(0)
  const playerIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!opts.code) return
    const client = connectRoom({
      url: roomWsUrl(opts.wsUrl, opts.code),
      code: opts.code,
      name: opts.name,
    })
    clientRef.current = client
    setConnected(false)
    setError(null)
    setPaused(null)
    setReplaceAvailable(null)

    const unsubConn = client.subscribeConnection((ok) => {
      setConnected(ok)
    })

    const unsub = client.subscribe((msg: ServerMessage) => {
      if (msg.type === 'joined') {
        playerIdRef.current = msg.playerId
        setPlayerId(msg.playerId)
        setMySeat(msg.seat)
        setConnected(true)
        setError(null)
        return
      }
      if (msg.type === 'lobby') {
        setLobby(msg.lobby)
        const id = playerIdRef.current
        if (id) {
          const seated = ([0, 1, 2, 3] as Seat[]).find(
            (s) => msg.lobby.chairs[s]?.playerId === id,
          )
          setMySeat(seated ?? null)
        }
        const away = ([0, 1, 2, 3] as Seat[]).find(
          (s) => msg.lobby.chairs[s] != null && !msg.lobby.chairs[s]!.connected,
        )
        if (away == null) setPaused(null)
        return
      }
      if (msg.type === 'snapshot') {
        setView(msg.view)
        setMySeat(msg.view.viewerSeat)
        setPaused(msg.paused ?? null)
        if (!msg.paused) setReplaceAvailable(null)
        return
      }
      if (msg.type === 'paused') {
        setPaused({ name: msg.name, until: msg.until, seat: msg.seat })
        return
      }
      if (msg.type === 'replace_available') {
        setReplaceAvailable({ seat: msg.seat, name: msg.name })
        setPaused((prev) =>
          prev
            ? { ...prev, until: 0, seat: msg.seat, name: msg.name }
            : { name: msg.name, until: 0, seat: msg.seat },
        )
        return
      }
      if (msg.type === 'error') {
        setError({ code: msg.code, message: msg.message })
      }
    })

    return () => {
      unsub()
      unsubConn()
      client.close()
      clientRef.current = null
      setConnected(false)
    }
  }, [opts.wsUrl, opts.code, opts.name])

  const send = useCallback((msg: ClientMessage) => {
    clientRef.current?.send(msg)
  }, [])

  const sendAction = useCallback((action: GameAction) => {
    seqRef.current += 1
    setError(null)
    clientRef.current?.send({
      type: 'game_action',
      action,
      clientSeq: seqRef.current,
    })
  }, [])

  return {
    lobby,
    view,
    mySeat,
    playerId,
    connected,
    paused,
    replaceAvailable,
    error,
    send,
    sendAction,
  }
}

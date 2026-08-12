# Online Multiplayer (Friends Tables) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two phones can create or join a room, arrange seats, unanimously fill empty chairs with AI, and finish a Hearts, Spades, or Euchre match in real time, including reconnect after backgrounding.

**Architecture:** GitHub Pages keeps serving the Vite app. Each table is a Cloudflare Durable Object. Shared TypeScript in `src/multiplayer/` is the source of truth (protocol, lobby reducer, state projection, engine `apply`). The Worker is a thin WebSocket adapter. Solo and pass-and-play hooks stay unchanged.

**Tech Stack:** React 18, Vite 5, existing `src/games/*/engine.ts`, Cloudflare Workers + Durable Objects (`wrangler`), Vitest.

## Global Constraints

- Slice 1 only: no accounts, chat, matchmaking, career stats, or peer-to-peer.
- Reuse `src/games/hearts|spades|euchre/engine.ts` — do not reimplement rules.
- Engine seats stay `0=South, 1=West, 2=North, 3=East`; online UI rotates so `mySeat` draws as South.
- Room codes: 4 characters from `23456789ABCDEFGHJKMNPQRSTVWXYZ` (no `0/O/1/I`).
- Joiner seat order: first empty in `[1, 3, 2]` (two friends default to opponents).
- Fill-AI requires every currently seated human to approve; any sit/stand/swap/leave resets votes.
- Online matches must not call `saveStats`, `unlockAchievement`, or goal recorders.
- Client never mutates game state locally; it only renders server `snapshot` / `lobby`.
- Tests: `npx vitest run`. Do not break existing solo / pass-and-play tests.
- Commit after each task. Skip `node_modules/`, `dist/`, `*.tsbuildinfo`, secrets.

## File map

| File | Role |
|------|------|
| `src/multiplayer/protocol.ts` | Shared wire types |
| `src/multiplayer/codes.ts` | Room-code alphabet + generator |
| `src/multiplayer/lobby.ts` | Pure lobby reducer |
| `src/multiplayer/project.ts` | Strip opponent hands / pass secrets |
| `src/multiplayer/apply.ts` | Seat-gated wrapper over engines |
| `src/multiplayer/roomSession.ts` | In-memory room: lobby + match + timers injected |
| `src/multiplayer/seats.ts` | Partner/opponent chairs + screen rotation |
| `src/multiplayer/token.ts` | Player token helpers (testable random inject) |
| `src/multiplayer/client.ts` | Browser WebSocket + reconnect + seq |
| `src/hooks/useOnlineGame.ts` | Hook: lobby/match views, send actions |
| `src/components/FriendsLobby.tsx` + `.css` | Create/join/chairs/votes |
| `src/components/ConnectionBanner.tsx` | Reconnecting / replaced |
| `worker/index.ts` | HTTP create + WS upgrade |
| `worker/room.ts` | Durable Object wrapping `RoomSession` |
| `wrangler.jsonc` | DO binding `ROOM` |

Existing tables (`Table.tsx`, `SpadesTable.tsx`, `EuchreTable.tsx`) gain an optional `mySeat` + `online` prop in Tasks 4–6. Do not rewrite them.

---

### Task 1: Protocol, lobby, projection, apply

**Files:**
- Create: `src/multiplayer/protocol.ts`
- Create: `src/multiplayer/codes.ts`
- Create: `src/multiplayer/seats.ts`
- Create: `src/multiplayer/lobby.ts`
- Create: `src/multiplayer/project.ts`
- Create: `src/multiplayer/apply.ts`
- Test: `src/multiplayer/codes.test.ts`
- Test: `src/multiplayer/seats.test.ts`
- Test: `src/multiplayer/lobby.test.ts`
- Test: `src/multiplayer/project.test.ts`
- Test: `src/multiplayer/apply.test.ts`

**Interfaces:**
- Consumes: `Seat` from `src/core/types.ts`; `GameId` from `src/games/registry.ts`; `partnerOf` from `src/core/partnership.ts`; `HeartsState` / `SpadesState` / `EuchreState` and their `tryPlayCard` / `submitBid` / `passBid` / `orderUp` / `nameTrump` / `discardCard` / `goAlone` / `withPartner` / `togglePassCard` / `confirmPass` / `acceptReceived`; `createInitialState` + `dealHand` / `startNewGame` per game.
- Produces:
  - `ROOM_CODE_ALPHABET`, `newRoomCode(rng?: () => number): string`
  - `JOINER_SEAT_ORDER: readonly Seat[]` = `[1, 3, 2]`
  - `screenSlot(engineSeat: Seat, mySeat: Seat): Seat` — `(engineSeat - mySeat + 4) % 4`
  - `partnerSeat(vs: Seat): Seat` — `partnerOf(vs)`
  - `preferredOpponentSeat(vs: Seat, occupied: ReadonlySet<Seat>): Seat | null` — try `(vs + 1) % 4`, else `(vs + 3) % 4`, skip `vs`/`partnerOf(vs)`/occupied
  - `LobbyState`, `reduceLobby(state, action, playerId): { state: LobbyState; error?: { code: ErrorCode; message: string } }`
  - `canStart(lobby: LobbyState): boolean`
  - `projectForSeat(bundle: GameBundle, viewer: Seat): ProjectedState`
  - `applyGameAction(bundle: GameBundle, action: GameAction, seat: Seat): ApplyResult`

- [ ] **Step 1: Write failing tests**

Create `src/multiplayer/codes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ROOM_CODE_ALPHABET, newRoomCode } from './codes'

describe('newRoomCode', () => {
  it('is 4 chars from the safe alphabet', () => {
    const code = newRoomCode(() => 0)
    expect(code).toHaveLength(4)
    for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch)
  })

  it('never uses 0 O 1 I', () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OI]/)
  })
})
```

Create `src/multiplayer/seats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { partnerSeat, preferredOpponentSeat, screenSlot } from './seats'

describe('seats', () => {
  it('rotates mySeat to South (slot 0)', () => {
    expect(screenSlot(2, 2)).toBe(0)
    expect(screenSlot(0, 2)).toBe(2)
  })

  it('partner is across', () => {
    expect(partnerSeat(0)).toBe(2)
    expect(partnerSeat(1)).toBe(3)
  })

  it('prefers clockwise opponent, then the other', () => {
    expect(preferredOpponentSeat(0, new Set())).toBe(1)
    expect(preferredOpponentSeat(0, new Set([1]))).toBe(3)
    expect(preferredOpponentSeat(0, new Set([1, 3]))).toBeNull()
  })
})
```

Create `src/multiplayer/lobby.test.ts` covering: creator sits 0; first joiner sits 1; fill-AI votes reset on sit; `canStart` false until all chairs human or fill-AI unanimous; swap accept exchanges seats; `sit_relative` partner lands on `partnerOf`.

```ts
import { describe, expect, it } from 'vitest'
import { canStart, createLobby, reduceLobby } from './lobby'

const host = { playerId: 'p0', name: 'Ada' }
const guest = { playerId: 'p1', name: 'Ben' }

describe('lobby', () => {
  it('seats creator South and first joiner West', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    expect(l.chairs[0]?.playerId).toBe('p0')
    const r = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1')
    expect(r.state.chairs[1]?.playerId).toBe('p1')
    expect(r.state.chairs[2]).toBeNull()
  })

  it('resets fill-AI votes when someone sits', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'vote_fill_ai', approve: true }, 'p0').state
    expect(l.fillAiVotes['p0']).toBe(true)
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    expect(l.fillAiVotes).toEqual({})
  })

  it('cannot start with empty chairs until unanimous fill-AI', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'hearts', hostId: 'p0', hostName: 'Ada' })
    expect(canStart(l)).toBe(false)
    l = reduceLobby(l, { type: 'vote_fill_ai', approve: true }, 'p0').state
    expect(canStart(l)).toBe(true)
  })

  it('sit_relative partner claims the across chair', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    l = reduceLobby(l, { type: 'sit_relative', vsSeat: 0, relation: 'partner' }, 'p1').state
    expect(l.chairs[2]?.playerId).toBe('p1')
    expect(l.chairs[1]).toBeNull()
  })

  it('swap_request + accept exchanges two humans', () => {
    let l = createLobby({ code: 'K7QM', gameId: 'spades', hostId: 'p0', hostName: 'Ada' })
    l = reduceLobby(l, { type: 'hello', name: 'Ben' }, 'p1').state
    l = reduceLobby(l, { type: 'sit', seat: 2 }, 'p1').state
    l = reduceLobby(l, { type: 'hello', name: 'Cam' }, 'p2').state
    l = reduceLobby(l, { type: 'hello', name: 'Dee' }, 'p3').state
    expect(l.chairs[0]?.playerId).toBe('p0')
    expect(l.chairs[2]?.playerId).toBe('p1')
    l = reduceLobby(l, { type: 'swap_request', withSeat: 2 }, 'p0').state
    l = reduceLobby(l, { type: 'swap_respond', accept: true }, 'p1').state
    expect(l.chairs[0]?.playerId).toBe('p1')
    expect(l.chairs[2]?.playerId).toBe('p0')
  })
})
```

Create `src/multiplayer/project.test.ts` — deal a real Spades hand, project for seat 0, assert no foreign card ids appear in `JSON.stringify(view)`:

```ts
import { describe, expect, it } from 'vitest'
import { createInitialState, dealHand, startNewGame } from '../games/spades/engine'
import { projectForSeat } from './project'

describe('projectForSeat', () => {
  it('never includes another seat\'s card ids (spades)', () => {
    let s = dealHand(startNewGame(createInitialState()))
    const mine = new Set(s.players[0].hand.map((c) => c.id))
    const foreign = [1, 2, 3].flatMap((seat) => s.players[seat as 1 | 2 | 3].hand.map((c) => c.id))
    const view = projectForSeat({ gameId: 'spades', state: s }, 0)
    const blob = JSON.stringify(view)
    for (const id of foreign) expect(blob.includes(JSON.stringify(id)) || blob.includes(id)).toBe(false)
    expect(view.gameId).toBe('spades')
    if (view.gameId === 'spades') {
      expect(view.state.players[0].hand.map((c) => c.id).sort()).toEqual([...mine].sort())
      expect(view.state.players[1].hand).toEqual([])
      expect(view.state.players[1].cardCount).toBe(s.players[1].hand.length)
    }
  })
})
```

Add the same leak test for Hearts (after `dealHand`) and Euchre. For Hearts mid-pass, put cards in `passSelections[1]` and `players[1].selectedPass` and assert those ids are absent from seat-0 projection.

Create `src/multiplayer/apply.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeCard } from '../core/cards'
import { createInitialState, dealHand, startNewGame } from '../games/spades/engine'
import { applyGameAction } from './apply'

describe('applyGameAction', () => {
  it('rejects a play when it is not that seat\'s turn', () => {
    const s = dealHand(startNewGame(createInitialState()))
    const card = s.players[1].hand[0]
    const result = applyGameAction(
      { gameId: 'spades', state: s },
      { type: 'play_card', cardId: card.id },
      1,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('not_your_turn')
  })

  it('rejects a card not in the seat\'s hand', () => {
    let s = dealHand(startNewGame(createInitialState()))
    // force playing phase and whoseTurn 0
    s = { ...s, phase: 'playing', whoseTurn: 0 }
    const result = applyGameAction(
      { gameId: 'spades', state: s },
      { type: 'play_card', cardId: makeCard('clubs', 'A').id },
      0,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(['illegal', 'not_your_turn']).toContain(result.code)
  })
})
```

If `dealHand` leaves phase `bidding` (it does), the first test is enough: seat 1 playing is `not_your_turn`. For a successful apply, take a bidding state and `submit_bid` as `whoseTurn`:

```ts
  it('applies a legal spades bid for whoseTurn', () => {
    const s = dealHand(startNewGame(createInitialState()))
    const seat = s.whoseTurn
    expect(seat).not.toBeNull()
    const result = applyGameAction(
      { gameId: 'spades', state: s },
      { type: 'submit_bid', bid: 3 },
      seat!,
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.bundle.gameId === 'spades') {
      expect(result.bundle.state.bids[seat!]?.bid).toBe(3)
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/multiplayer`

Expected: FAIL — cannot find modules `./codes`, `./lobby`, etc.

- [ ] **Step 3: Implement**

`src/multiplayer/protocol.ts` — copy these types exactly (later tasks import them):

```ts
import type { Seat } from '../core/types'
import type { Suit } from '../core/types'
import type { GameId } from '../games/registry'
import type { HeartsState } from '../games/hearts/engine'
import type { SpadesState } from '../games/spades/engine'
import type { EuchreState } from '../games/euchre/engine'

export type GameMode = 'local' | 'passAndPlay' | 'online'

export type ErrorCode =
  | 'not_your_turn'
  | 'illegal'
  | 'unknown_action'
  | 'unknown_token'
  | 'rate_limited'
  | 'room_full'
  | 'seat_taken'
  | 'cannot_start'
  | 'not_in_lobby'
  | 'not_in_match'

export type GameAction =
  | { type: 'toggle_pass_card'; cardId: string }
  | { type: 'confirm_pass' }
  | { type: 'accept_received' }
  | { type: 'play_card'; cardId: string }
  | { type: 'submit_bid'; bid: number; nil?: boolean; blindNil?: boolean }
  | { type: 'pass_bid' }
  | { type: 'order_up' }
  | { type: 'name_trump'; suit: Suit }
  | { type: 'discard'; cardId: string }
  | { type: 'go_alone' }
  | { type: 'with_partner' }

export type ClientMessage =
  | { type: 'hello'; token?: string; name: string }
  | { type: 'sit'; seat: Seat }
  | { type: 'stand' }
  | { type: 'sit_relative'; vsSeat: Seat; relation: 'partner' | 'opponent' }
  | { type: 'swap_request'; withSeat: Seat }
  | { type: 'swap_respond'; accept: boolean }
  | { type: 'vote_fill_ai'; approve: boolean }
  | { type: 'start' }
  | { type: 'game_action'; action: GameAction; clientSeq: number }
  | { type: 'rematch' }
  | { type: 'leave' }

export type TableEvent =
  | { type: 'card_played'; seat: Seat; cardId: string }
  | { type: 'trick_won'; winner: Seat }
  | { type: 'bid_locked'; seat: Seat }
  | { type: 'pass_done' }
  | { type: 'hand_over' }

export type GameBundle =
  | { gameId: 'hearts'; state: HeartsState }
  | { gameId: 'spades'; state: SpadesState }
  | { gameId: 'euchre'; state: EuchreState }

export type ProjectedPlayer = { cardCount: number }

export type ProjectedState = GameBundle & { viewerSeat: Seat }

export type ApplyResult =
  | { ok: true; bundle: GameBundle }
  | { ok: false; code: ErrorCode; message: string }

export interface LobbyOccupant {
  playerId: string
  name: string
  connected: boolean
}

export interface PendingSwap {
  fromSeat: Seat
  toSeat: Seat
}

export interface LobbyState {
  code: string
  gameId: GameId
  hostId: string
  phase: 'lobby' | 'starting'
  chairs: Record<Seat, LobbyOccupant | null>
  fillAiVotes: Record<string, boolean>
  pendingSwap: PendingSwap | null
  aiDifficulty: 'easy' | 'medium' | 'hard'
}
```

`src/multiplayer/codes.ts`:

```ts
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

export function newRoomCode(rng: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < 4; i++) {
    out += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length)]!
  }
  return out
}
```

`src/multiplayer/seats.ts`:

```ts
import type { Seat } from '../core/types'
import { partnerOf } from '../core/partnership'

export const JOINER_SEAT_ORDER: readonly Seat[] = [1, 3, 2]

export function screenSlot(engineSeat: Seat, mySeat: Seat): Seat {
  return (((engineSeat - mySeat + 4) % 4) as Seat)
}

export function partnerSeat(vs: Seat): Seat {
  return partnerOf(vs)
}

export function preferredOpponentSeat(vs: Seat, occupied: ReadonlySet<Seat>): Seat | null {
  const partner = partnerOf(vs)
  for (const cand of [((vs + 1) % 4) as Seat, ((vs + 3) % 4) as Seat]) {
    if (cand === vs || cand === partner) continue
    if (!occupied.has(cand)) return cand
  }
  return null
}

export function firstEmptyJoinerSeat(chairs: Record<Seat, unknown | null>): Seat | null {
  for (const s of JOINER_SEAT_ORDER) {
    if (chairs[s] == null) return s
  }
  if (chairs[0] == null) return 0
  return null
}
```

`src/multiplayer/lobby.ts` — implement `createLobby({ code, gameId, hostId, hostName, aiDifficulty? })` seating host at 0. `reduceLobby` handles every lobby `ClientMessage` type except `game_action` / `rematch` (those return `error: { code: 'not_in_match' }` if still lobby, or ignore). On `hello` for a new `playerId`, seat via `firstEmptyJoinerSeat`. On `sit`, reject `seat_taken`. On any chair-set change (`sit`, `stand`, `hello` that seats, swap apply, leave), set `fillAiVotes = {}` and `pendingSwap = null`. `canStart`: every seat is occupied by a human **or** (`every seated human id is in fillAiVotes` and empty seats exist). If all four chairs are human, fill-AI is not required. `start` only succeeds when `canStart` is true; then `phase = 'starting'`.

When `sit_relative` + `partner` and `partnerSeat(vs)` is occupied by another human, set `pendingSwap` instead of moving (do not fail silently). When `opponent` and `preferredOpponentSeat` is null, set `pendingSwap` toward the clockwise opponent occupant.

`src/multiplayer/project.ts` — deep-clone via structured copy of players. For each other seat: `hand = []`, add `cardCount: original.hand.length`. Hearts: clear `selectedPass` for others; `passSelections` only keep `viewer`; `receivedCards` empty unless viewer is the one receiving (if `pendingReceives[viewer]` exists, expose that as `receivedCards` and empty other pending keys). Euchre: if `phase === 'idle'` hide `kitty` (empty array) but keep `upcard` as the engine does during bidding; if the engine already nulls `upcard` after turn-down, do nothing extra. Always set `viewerSeat`.

Attach `cardCount` on the projected player objects even though the engine type has no `cardCount` — extend the projected player with `& { cardCount: number }` in `project.ts` and type `ProjectedState` accordingly. Update `protocol.ts` `ProjectedState` if needed so TypeScript matches the test (`players[1].cardCount`).

`src/multiplayer/apply.ts`:

```ts
export function applyGameAction(bundle: GameBundle, action: GameAction, seat: Seat): ApplyResult {
  if (bundle.gameId === 'spades') {
    const s = bundle.state
    if (action.type === 'submit_bid') {
      if (s.whoseTurn !== seat) return { ok: false, code: 'not_your_turn', message: 'Not your turn.' }
      const next = submitBid(s, seat, action.bid, action.nil, action.blindNil)
      if (next.bids[seat] == null && s.bids[seat] == null) {
        return { ok: false, code: 'illegal', message: next.warning ?? 'Illegal bid.' }
      }
      return { ok: true, bundle: { gameId: 'spades', state: next } }
    }
    if (action.type === 'play_card') {
      if (s.whoseTurn !== seat) return { ok: false, code: 'not_your_turn', message: 'Not your turn.' }
      const card = s.players[seat].hand.find((c) => c.id === action.cardId)
      if (!card) return { ok: false, code: 'illegal', message: 'Card not in hand.' }
      const next = tryPlayCard(s, seat, card)
      if (next.currentTrick.length === s.currentTrick.length && next.whoseTurn === s.whoseTurn) {
        return { ok: false, code: 'illegal', message: next.warning ?? 'Illegal play.' }
      }
      return { ok: true, bundle: { gameId: 'spades', state: next } }
    }
    return { ok: false, code: 'unknown_action', message: 'Not a Spades action.' }
  }
  // hearts: toggle_pass_card / confirm_pass / accept_received / play_card using existing engine
  // euchre: pass_bid / order_up / name_trump / discard / go_alone / with_partner / play_card
}
```

Implement Hearts and Euchre branches the same way: resolve `cardId` → `Card` from that seat’s hand; call the existing function; if state is unchanged (same phase/trick/hand length) and `warning` is set, return `illegal`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/multiplayer`

Expected: PASS. Then `npx vitest run` — existing suite still green.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer
git commit -m "Add multiplayer protocol, lobby reducer, projection, and apply"
```

---

### Task 2: Room session + Worker scaffold

**Files:**
- Create: `src/multiplayer/token.ts`
- Create: `src/multiplayer/roomSession.ts`
- Test: `src/multiplayer/roomSession.test.ts`
- Create: `worker/index.ts`
- Create: `worker/room.ts`
- Create: `wrangler.jsonc`
- Modify: `package.json` (add `wrangler` devDependency and `"worker:dev": "wrangler dev"`)
- Modify: `.gitignore` if `.wrangler` is missing

**Interfaces:**
- Consumes: Task 1 `reduceLobby`, `canStart`, `applyGameAction`, `projectForSeat`, `newRoomCode`, `ClientMessage`, `ServerMessage` (add `ServerMessage` to `protocol.ts` if not already exported — it must match the spec: `joined | lobby | snapshot | event | error`).
- Produces:
  - `newPlayerToken(bytes?: () => Uint8Array): string` — 16 random bytes, hex or base64url
  - `class RoomSession` with `handle(playerId: string, msg: ClientMessage, now: number): Outbox`
  - `type Outbox = { to: { playerId: string; msg: ServerMessage }[]; delayMs?: { kind: 'ai' | 'recap' | 'lobby_disconnect' | 'match_disconnect'; ms: number; seat?: Seat } }`
  - HTTP `POST /rooms` `{ gameId, name, rules? }` → `{ code }`
  - WS `GET /room/:code`

- [ ] **Step 1: Write failing roomSession tests**

```ts
import { describe, expect, it } from 'vitest'
import { RoomSession } from './roomSession'

describe('RoomSession', () => {
  it('create + hello returns joined token and lobby with host in seat 0', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    const out = room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const joined = out.to.find((m) => m.msg.type === 'joined')
    expect(joined?.msg.type).toBe('joined')
    const lobby = out.to.find((m) => m.msg.type === 'lobby')
    expect(lobby?.msg.type).toBe('lobby')
    if (lobby?.msg.type === 'lobby') {
      expect(lobby.msg.lobby.chairs[0]?.name).toBe('Ada')
    }
  })

  it('start after host fill-AI deals a projected snapshot with hidden hands', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    const out = room.handle('p0', { type: 'start' }, 0)
    const snap = out.to.find((m) => m.msg.type === 'snapshot')
    expect(snap).toBeTruthy()
    if (snap?.msg.type === 'snapshot' && snap.msg.view.gameId === 'spades') {
      expect(snap.msg.view.state.players[1].hand).toEqual([])
      expect(snap.msg.view.state.players[0].hand.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/multiplayer/roomSession.test.ts`

Expected: FAIL — `RoomSession` not found.

- [ ] **Step 3: Implement RoomSession**

Keep the Durable Object thin. `RoomSession` owns:

- `lobby: LobbyState`
- `tokens: Map<playerId, token>`
- `bundle: GameBundle | null` after start
- `seq: number`
- `lastClientSeq: Map<playerId, number>`
- `disconnectedAt: Map<playerId, number>`

`handle`:
- `hello` with unknown player: if lobby, `reduceLobby` hello; mint token; broadcast `lobby`. If match and unknown token, `error` `unknown_token` (cannot reclaim).
- `hello` with known token mapped to playerId: mark connected; if match, send `snapshot` projected for their seat.
- `start`: if `canStart`, build engine prefs from chairs (human names, `isHuman: true`; empty chairs become AI with `createLobby`’s `aiDifficulty` and default names Angie/Scott/Heather from `DEFAULT_NAMES` in `src/prefs.ts`), call that game’s `createInitialState` + `startNewGame` + `dealHand`, set `bundle`, broadcast per-player `snapshot`.
- `game_action`: look up seat of playerId; ignore duplicate `clientSeq`; `applyGameAction`; on failure send `error` + last `snapshot` to that player; on success increment `seq`, send `snapshot` to each connected human (projected).
- Do **not** implement 90s replace-with-AI yet (Task 7). Optional: if `whoseTurn` is AI after an apply, set `delayMs: { kind: 'ai', ms: 900 }`. Add `tick(now)` that calls `runAiTurn` for the current game when that delay fires.

Export `ServerMessage` from `protocol.ts` if missing:

```ts
export type ServerMessage =
  | { type: 'joined'; token: string; playerId: string; seat: Seat | null }
  | { type: 'lobby'; lobby: LobbyView }
  | { type: 'snapshot'; view: ProjectedState; seq: number }
  | { type: 'event'; event: TableEvent; seq: number }
  | { type: 'error'; code: ErrorCode; message: string; seq?: number }

export type LobbyView = LobbyState
```

`newPlayerToken`: 16 bytes → hex string.

Worker files: `wrangler.jsonc` with `main: "worker/index.ts"`, `durable_objects.bindings: [{ name: "ROOM", class_name: "RoomDurableObject" }]`, `migrations: [{ tag: "v1", new_sqlite_classes: ["RoomDurableObject"] }]`.

`worker/index.ts`: `POST /rooms` JSON `{ gameId, name }` generates code, `env.ROOM.idFromName(code)`, stub `fetch` to create. `GET /room/:code` upgrades WebSocket and forwards to the DO.

`worker/room.ts`: on WS message, parse JSON as `ClientMessage`, call `session.handle`, send each `Outbox.to` entry on that player’s socket. Persist session JSON in DO storage after each handle. This Worker can be a stub that imports `RoomSession` — if wrangler cannot import `../src` yet, set `"alias"` or put `no_bundling` off (default wrangler bundles and can import `../src/multiplayer/roomSession.ts`).

Do not add a production Cloudflare deploy workflow in this task. Local `npx wrangler dev` is enough.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/multiplayer`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer worker wrangler.jsonc package.json package-lock.json .gitignore
git commit -m "Add room session and Cloudflare Worker scaffold"
```

---

### Task 3: Client lobby UI + WebSocket client

**Files:**
- Create: `src/multiplayer/client.ts`
- Create: `src/hooks/useOnlineGame.ts`
- Create: `src/components/FriendsLobby.tsx`
- Create: `src/components/FriendsLobby.css`
- Modify: `src/components/Home.tsx` — add `onPlayFriends: (id: GameId) => void` and a **Friends** button per game tile
- Modify: `src/components/Home.css` — style the friends button next to New table
- Modify: `src/hooks/useCardTable.ts` — screen `'friends'` or `activeOnline` flag; wire `onPlayFriends`
- Modify: `src/App.tsx` — render `FriendsLobby` when that screen is active
- Modify: `src/vite-env.d.ts` (or `src/appVersion.ts` neighbors) — `interface ImportMetaEnv { readonly VITE_WS_URL: string }`
- Test: `src/multiplayer/client.test.ts` (fake WebSocket)

**Interfaces:**
- Consumes: `ClientMessage`, `ServerMessage`, `LobbyState`, `RoomSession` behavior (wire format).
- Produces:
  - `connectRoom(opts: { url: string; code: string; name: string; token?: string }): RoomClient`
  - `RoomClient` `{ send(msg: ClientMessage): void; subscribe(fn: (msg: ServerMessage) => void): () => void; close(): void }`
  - Token storage keys: `cardtable.mp.token.${code}` in `localStorage` and `sessionStorage`
  - `useOnlineGame(opts: { wsUrl: string; code: string | null; name: string; gameId: GameId })`

- [ ] **Step 1: Write failing client test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { connectRoom } from './client'

class FakeWS {
  static OPEN = 1
  readyState = 1
  sent: string[] = []
  onmessage: ((ev: { data: string }) => void) | null = null
  send(data: string) { this.sent.push(data) }
  close() {}
}

describe('connectRoom', () => {
  it('sends hello on open and forwards snapshots', () => {
    const ws = new FakeWS()
    const factory = () => ws as unknown as WebSocket
    const client = connectRoom({
      url: 'ws://test/room/K7QM',
      code: 'K7QM',
      name: 'Ada',
      transport: factory,
    })
    const seen: unknown[] = []
    client.subscribe((m) => seen.push(m))
    ws.onmessage?.({ data: JSON.stringify({ type: 'joined', token: 'abc', playerId: 'p0', seat: 0 }) })
    expect(seen[0]).toEqual({ type: 'joined', token: 'abc', playerId: 'p0', seat: 0 })
    client.send({ type: 'vote_fill_ai', approve: true })
    expect(JSON.parse(ws.sent[0]).type).toBe('vote_fill_ai')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/multiplayer/client.test.ts`

Expected: FAIL — `connectRoom` not exported.

- [ ] **Step 3: Implement client, hook, and lobby UI**

`connectRoom` creates a WebSocket to `${url}` (already includes `/room/CODE`). On `open`, send `{ type: 'hello', token, name }`. Parse incoming JSON; if `joined`, persist `token` under `cardtable.mp.token.${code}`. Reconnect: on `close`, wait 1s and reconnect with the stored token (max 20 attempts). Expose `transport` option for tests.

`FriendsLobby` mobile-first: game title, big room code, Copy and Share (`navigator.share` if present, else copy link `${location.origin}${location.pathname}?room=CODE&game=spades`). Four chair buttons laid out N / W-E / S. Empty chairs show “Empty”. Seated chairs show name + green/gray dot (`connected`). Tap empty → `sit`. For Spades/Euchre, under another player’s chair: **Partner with [name]** / **Sit against [name]**. **Fill remaining seats with AI** toggle button (sends `vote_fill_ai`). **Start game** disabled until a `lobby` message would have `canStart` — compute the same `canStart` on the client from the last `LobbyState`. Show “Waiting for everyone to approve AI fill…” when votes are incomplete.

Home: on each available game tile (or the stack), add a button `Friends` that calls `onPlayFriends(game.id)`. `useCardTable` sets screen to friends and remembers `friendsGameId`. `App.tsx` renders `FriendsLobby` with `wsUrl={import.meta.env.VITE_WS_URL ?? 'ws://127.0.0.1:8787'}`.

Create-room: `FriendsLobby` on first paint if no `?room=` — `POST ${httpOrigin}/rooms` with `{ gameId, name }` where `httpOrigin` is `VITE_WS_URL` with `ws`→`http`. Then connect WS.

If `?room=K7QM` is present, skip create and join that code (ask for name if prefs seat 0 name is empty; default `prefs.seats[0].name`).

Do **not** mount a card table yet — after `snapshot`, show a placeholder “Match starting…” so Task 4 can replace it.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/multiplayer src/passAndPlay.test.ts`

Expected: PASS. Manually: `npm run worker:dev` in one terminal, `npm run dev` in another, open two tabs, create/join, sit, vote, start, see placeholder.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer/client.ts src/multiplayer/client.test.ts src/hooks/useOnlineGame.ts src/components/FriendsLobby.tsx src/components/FriendsLobby.css src/components/Home.tsx src/components/Home.css src/hooks/useCardTable.ts src/App.tsx src/vite-env.d.ts
git commit -m "Add friends lobby UI and multiplayer WebSocket client"
```

---

### Task 4: Spades online match

**Files:**
- Modify: `src/hooks/useOnlineGame.ts` — on `snapshot` with `gameId === 'spades'`, hold `view` and `mySeat`
- Modify: `src/App.tsx` — if online match is Spades, render `SpadesTable` from the projected state
- Modify: `src/components/SpadesTable.tsx` — add optional `mySeat?: Seat` (default `0`) and `online?: boolean`. When `online`, do not call undo; map seat positions with `screenSlot(seat, mySeat)`; send plays/bids via `onOnlineAction` instead of local engine
- Modify: `src/hooks/useSpadesGame.ts` — do **not** use this hook for online. All mutations go `client.send({ type: 'game_action', action, clientSeq })`
- Modify: `src/multiplayer/roomSession.ts` — after start and after each apply, if `whoseTurn` is an AI seat, `tick` applies `runAiTurn` from `src/games/spades/engine.ts`
- Test: `src/multiplayer/roomSession.spades.test.ts` — two humans vote fill-AI, start, both bid when it is their turn (skip AI seats via tick), play until `hand_result` or at least 4 tricks

**Interfaces:**
- Consumes: `applyGameAction`, `projectForSeat`, `runAiTurn` / `advanceAfterTrick` / `nextHand` from Spades engine.
- Produces: `useOnlineGame().sendAction(action: GameAction)` increments `clientSeq`. Server auto-calls `nextHand` 3000ms after `phase === 'hand_result'` (injectable clock in tests: `room.tick(now)`).

- [ ] **Step 1: Write failing scripted-hand test**

```ts
import { describe, expect, it } from 'vitest'
import { RoomSession } from './roomSession'

describe('RoomSession spades loop', () => {
  it('two humans + two AI can bid', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p1', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    // Drive AI bids / human bids until phase is playing
    let now = 0
    for (let i = 0; i < 20; i++) {
      const bundle = room.debugBundle()
      if (!bundle || bundle.gameId !== 'spades') throw new Error('no bundle')
      if (bundle.state.phase === 'playing') break
      const turn = bundle.state.whoseTurn
      if (turn == null) break
      const occupant = room.debugLobby().chairs[turn]
      if (occupant) {
        room.handle(occupant.playerId, {
          type: 'game_action',
          action: { type: 'submit_bid', bid: 3 },
          clientSeq: i + 1,
        }, now)
      } else {
        now += 1000
        room.tick(now)
      }
    }
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('spades')
    if (bundle?.gameId === 'spades') expect(bundle.state.phase).toBe('playing')
  })
})
```

Export `debugBundle()` / `debugLobby()` on `RoomSession` for tests only (or `/** @internal */`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/multiplayer/roomSession.spades.test.ts`

Expected: FAIL until start+AI tick+bid loop is wired.

- [ ] **Step 3: Implement Spades online path**

`RoomSession.tick`: if delay kind `ai` and game is spades, `bundle.state = runAiTurn(bundle.state)` (repeat while whoseTurn is still AI and phase allows, or once per tick — once per tick is enough). After `hand_result`, schedule recap 3000ms then `nextHand`.

`SpadesTable`: add props:

```ts
mySeat?: Seat
online?: boolean
onOnlineAction?: (action: GameAction) => void
```

When `online`, `onCardClick` / bid submit call `onOnlineAction`. Hide undo. Compute “you” as `mySeat` for legal highlighting: pass `getLegalForHuman(state, mySeat)` from the hook using projected hand (only your cards are present, which is correct).

`useOnlineGame` returns `{ lobby, view, mySeat, sendAction, connected }`. `App.tsx` if `view?.gameId === 'spades'` render `SpadesTable` with `state={view.state}` (cast projected players so missing opponent hands are `[]`).

Do not write career stats in this path.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/multiplayer src/games/spades`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer src/hooks/useOnlineGame.ts src/components/SpadesTable.tsx src/App.tsx
git commit -m "Play Spades online through the room session"
```

---

### Task 5: Hearts online (parallel pass)

**Files:**
- Modify: `src/games/hearts/engine.ts` — add `togglePassCardForSeat`, `confirmPassForSeat`, `acceptReceivedForSeat` that do not walk other humans
- Modify: `src/games/hearts/engine.test.ts` — sequential `confirmPass` still used by pass-and-play; new tests for parallel confirm then one finalize
- Modify: `src/multiplayer/apply.ts` — Hearts pass actions call the `ForSeat` helpers
- Modify: `src/multiplayer/project.ts` — already hides foreign pass picks; add test if missing
- Modify: `src/multiplayer/roomSession.ts` — on deal, immediately `choosePassCards` + store for each AI seat; when all humans confirmed, finalize
- Modify: `src/components/Table.tsx` — `mySeat`, `online`, `onOnlineAction`; never mount `PassDeviceBanner` when `online`
- Modify: `src/App.tsx` — render Hearts table for online hearts snapshots
- Test: `src/multiplayer/roomSession.hearts.test.ts`

**Interfaces:**
- Consumes: `choosePassCards` from `src/games/hearts/ai.ts`; existing `finalizePassExchange` (keep it private or export if needed).
- Produces:
  - `togglePassCardForSeat(state: HeartsState, seat: Seat, card: Card): HeartsState`
  - `confirmPassForSeat(state: HeartsState, seat: Seat): HeartsState` — writes `passSelections[seat]`; if every human seat has a selection of `passCount` and every AI seat already has one, call existing finalize; otherwise stay in `passing` with `whoseTurn` unchanged or `null` meaning “all may pass”
  - `acceptReceivedForSeat(state: HeartsState, seat: Seat): HeartsState`

- [ ] **Step 1: Write failing engine tests**

In `src/games/hearts/engine.test.ts`:

```ts
  it('confirmPassForSeat lets two humans confirm without rotating whoseTurn', () => {
    let s = dealHand(startNewGame(createInitialState()))
    s = {
      ...s,
      players: {
        ...s.players,
        0: { ...s.players[0], isHuman: true },
        1: { ...s.players[1], isHuman: false },
        2: { ...s.players[2], isHuman: true },
        3: { ...s.players[3], isHuman: false },
      },
    }
    const n = s.rules.passCount
    const ai1 = choosePassCards(s.players[1].hand, 'medium', n, () => 0.1)
    const ai3 = choosePassCards(s.players[3].hand, 'medium', n, () => 0.1)
    s = { ...s, passSelections: { 1: ai1, 3: ai3 }, phase: 'passing' }
    for (const card of s.players[0].hand.slice(0, n)) {
      s = togglePassCardForSeat(s, 0, card)
    }
    s = confirmPassForSeat(s, 0)
    expect(s.phase).toBe('passing')
    expect(s.whoseTurn).not.toBe(2)
    for (const card of s.players[2].hand.slice(0, n)) {
      s = togglePassCardForSeat(s, 2, card)
    }
    s = confirmPassForSeat(s, 2)
    expect(['receiving', 'playing']).toContain(s.phase)
  })
```

Do not change the existing sequential `confirmPass` tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/games/hearts/engine.test.ts`

Expected: FAIL — `confirmPassForSeat` not exported.

- [ ] **Step 3: Implement ForSeat helpers and online Hearts**

Implement the three functions next to `confirmPass` / `acceptReceived` in `engine.ts`. Reuse `finalizePassExchange` (export it if it is not already). `confirmPass` (old) stays the sequential pass-and-play path.

`apply.ts` Hearts branch calls `ForSeat` variants.

`RoomSession` on Hearts start: after deal, for each AI seat run `choosePassCards` and set `passSelections[seat]`. Broadcast snapshots. Humans send `toggle_pass_card` / `confirm_pass` in any order.

`Table.tsx`: if `online`, hide `PassDeviceBanner`; all humans see the pass picker when `phase === 'passing'` and they have not confirmed yet (`!passSelections[mySeat]`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/games/hearts src/multiplayer`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/games/hearts/engine.ts src/games/hearts/engine.test.ts src/multiplayer src/components/Table.tsx src/App.tsx
git commit -m "Add parallel Hearts pass and online Hearts table"
```

---

### Task 6: Euchre online

**Files:**
- Modify: `src/multiplayer/apply.ts` — already has euchre actions from Task 1; fill any gaps (`ack` phases: if the engine requires `ackTrumpCall` / `ackDiscardComplete` / `ackLonerChoice`, auto-ack on the server after 3s like recaps, or apply immediately in `RoomSession` so online does not stall)
- Modify: `src/multiplayer/project.ts` — hide `kitty` cards that are not the public `upcard`; never send face-down kitty ids
- Test: `src/multiplayer/project.test.ts` — euchre after deal: foreign hands + non-upcard kitty ids absent from JSON
- Modify: `src/multiplayer/roomSession.ts` — `runAiTurn` from euchre engine on AI delay
- Modify: `src/components/EuchreTable.tsx` — `mySeat`, `online`, `onOnlineAction`; stick-the-dealer still uses existing UI but sends `name_trump`
- Modify: `src/App.tsx` — render Euchre table for online euchre
- Test: `src/multiplayer/roomSession.euchre.test.ts` — start 1 human + fill-AI, tick AI through first bidding decision

**Interfaces:**
- Consumes: `passBid`, `orderUp`, `nameTrump`, `discardCard`, `goAlone`, `withPartner`, `tryPlayCard`, `runAiTurn`, `ackTrumpCall`, `ackDiscardComplete`, `ackLonerChoice`.
- Produces: online Euchre playable end-to-end via `RoomSession` + `EuchreTable`.

- [ ] **Step 1: Write failing projection + session tests**

```ts
  it('euchre projection hides kitty cards that are not the upcard', () => {
    const s = dealHand(startNewGame(createInitialState()))
    const hidden = s.kitty.filter((c) => c.id !== s.upcard?.id).map((c) => c.id)
    const view = projectForSeat({ gameId: 'euchre', state: s }, 0)
    const blob = JSON.stringify(view)
    for (const id of hidden) expect(blob.includes(id)).toBe(false)
    if (s.upcard) expect(blob.includes(s.upcard.id)).toBe(true)
  })
```

```ts
  it('starts euchre and lets the human act or ticks AI', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'euchre',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('euchre')
    if (bundle?.gameId === 'euchre') {
      expect(bundle.state.phase).toBe('bidding')
      expect(bundle.state.upcard).not.toBeNull()
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/multiplayer/project.test.ts src/multiplayer/roomSession.euchre.test.ts`

Expected: FAIL on kitty leak and/or missing euchre start.

- [ ] **Step 3: Implement**

In `projectForSeat` for euchre: `kitty: []` always for clients; keep `upcard` only when `state.upcard` is non-null (public). `pickedUpCard` only if `viewer === dealer` during `discard` phase.

`RoomSession`: auto-ack `awaitingTrumpAck` / `awaitingDiscardAck` / `awaitingLonerAck` on `tick` after 3000ms (or immediately in tests via tick). Wire `runAiTurn` for euchre.

`EuchreTable` online: bid buttons send `pass_bid` / `order_up` / `name_trump` / `go_alone` / `with_partner` / `discard` / `play_card`. Rotate seats with `screenSlot`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/games/euchre src/multiplayer`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer src/components/EuchreTable.tsx src/App.tsx
git commit -m "Play Euchre online with kitty projection"
```

---

### Task 7: Reconnect, replace-with-AI, rematch, share

**Files:**
- Create: `src/components/ConnectionBanner.tsx`
- Create: `src/components/ConnectionBanner.css`
- Modify: `src/multiplayer/roomSession.ts` — lobby 30s stand; match 90s pause; unanimous `vote_replace_ai` (new client message)
- Modify: `src/multiplayer/protocol.ts` — add `{ type: 'vote_replace_ai'; approve: boolean }` to `ClientMessage`; add `{ type: 'paused'; seat: Seat; until: number }` optional on `lobby`/`snapshot` wrapper or a `ServerMessage` `{ type: 'paused'; name: string; until: number }`
- Modify: `src/multiplayer/client.ts` — reconnect on `close` / `visibilitychange`
- Modify: `src/hooks/useOnlineGame.ts` — show banner from `paused` / `connected === false`
- Modify: `src/components/FriendsLobby.tsx` — copy/share already in Task 3; ensure `?room=` deep link works from a cold load
- Modify: `src/App.tsx` — mount `ConnectionBanner`; rematch button on match-over sends `{ type: 'rematch' }` (host only)
- Test: `src/multiplayer/roomSession.disconnect.test.ts`

**Interfaces:**
- Consumes: Task 2 `RoomSession.handle` / `tick`.
- Produces:
  - Lobby disconnect: `tick` at `disconnectedAt + 30_000` runs `stand` for that player if still disconnected and `bundle == null`.
  - Match disconnect: if it is that seat’s turn, pause (`pausedSeat`, `pausedUntil = now+90_000`); `tick` after that exposes `replaceVotes` to remaining humans; when unanimous, set `players[seat].isHuman = false` and resume `runAiTurn`.
  - Reconnect same token before timeout: clear pause, send snapshot.
  - `rematch`: only `hostId`, same chairs, new `createInitialState` + deal.

- [ ] **Step 1: Write failing disconnect tests**

```ts
import { describe, expect, it } from 'vitest'
import { RoomSession } from './roomSession'

describe('disconnect', () => {
  it('frees a lobby chair after 30s', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    room.markDisconnected('p1', 1000)
    room.tick(1000 + 30_000)
    expect(room.debugLobby().chairs[1]).toBeNull()
  })

  it('reconnect before 30s keeps the chair', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    const hello = room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    const joined = hello.to.find((m) => m.msg.type === 'joined')
    const token = joined?.msg.type === 'joined' ? joined.msg.token : ''
    room.markDisconnected('p1', 1000)
    room.handle('p1', { type: 'hello', token, name: 'Ben' }, 20_000)
    room.tick(1000 + 30_000)
    expect(room.debugLobby().chairs[1]?.playerId).toBe('p1')
  })

  it('replace-with-AI after 90s when remaining humans agree', () => {
    const room = RoomSession.create({
      code: 'K7QM',
      gameId: 'spades',
      hostId: 'p0',
      hostName: 'Ada',
    })
    room.handle('p0', { type: 'hello', name: 'Ada' }, 0)
    room.handle('p1', { type: 'hello', name: 'Ben' }, 0)
    room.handle('p0', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p1', { type: 'vote_fill_ai', approve: true }, 0)
    room.handle('p0', { type: 'start' }, 0)
    const seat1 = 1 as const
    room.markDisconnected('p1', 5_000)
    room.tick(5_000 + 90_000)
    room.handle('p0', { type: 'vote_replace_ai', approve: true }, 5_000 + 90_001)
    const bundle = room.debugBundle()
    expect(bundle?.gameId).toBe('spades')
    if (bundle?.gameId === 'spades') {
      expect(bundle.state.players[seat1].isHuman).toBe(false)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/multiplayer/roomSession.disconnect.test.ts`

Expected: FAIL — `markDisconnected` / replace flow missing.

- [ ] **Step 3: Implement disconnect, banner, rematch**

Add `markDisconnected(playerId, now)` used by the Worker on WS close and by tests. Implement the spec §5 timers. If the last human disconnects in-match, stop scheduling AI and set `idleSince`; `tick` at +10 minutes marks `closed` (Worker destroys DO).

`ConnectionBanner`: sticky top bar, copy “Alex is reconnecting…” or “Reconnecting to the table…”. After timeout, remaining players see **Replace with AI**.

`rematch`: host-only; same `LobbyState.chairs`; new deal; spectators (replaced players) stay spectators.

Deep link: on `App` / `useCardTable` boot, if `URLSearchParams` has `room`, open friends screen with that code (Task 3 may already do this — finish any gap).

- [ ] **Step 4: Run full verification**

Run: `npx vitest run`

Expected: all existing tests + new multiplayer tests PASS.

Run: `npx eslint src/multiplayer worker src/components/FriendsLobby.tsx src/components/ConnectionBanner.tsx`

Expected: clean.

Manual smoke (document in commit body, do not skip): two browser profiles, Spades full hand, Hearts pass, Euchre order-up; refresh mid-hand reconnects.

- [ ] **Step 5: Commit**

```bash
git add src/multiplayer src/components/ConnectionBanner.tsx src/components/ConnectionBanner.css src/hooks/useOnlineGame.ts src/App.tsx src/hooks/useCardTable.ts
git commit -m "Add online reconnect, AI replace, rematch, and invite links"
```

---

## Self-review (spec coverage)

| Spec section | Task |
|--------------|------|
| Create/join, 4-char code, share link | 2, 3, 7 |
| Display name + reconnect token | 2, 3, 7 |
| Chairs, joiner order `[1,3,2]`, partner/oppose, swap | 1, 3 |
| Unanimous fill-AI + start gate | 1, 2 |
| Authoritative DO + projection | 1, 2 |
| Spades / Hearts / Euchre play | 4, 5, 6 |
| Parallel Hearts pass | 5 |
| AI think delay + `runAiTurn` | 2, 4, 5, 6 |
| Rotate `mySeat` to South | 1 (`screenSlot`), 4–6 tables |
| No career stats | 4–6 (do not call stats APIs) |
| Lobby 30s / match 90s / replace AI / no bot-vs-bot | 7 |
| Rematch host / leave | 7 |
| Accounts, chat, matchmaking | Out of scope (no tasks) |

No TBDs remain in this plan. `ServerMessage` and `GameAction` names are identical in Tasks 1–7. `RoomSession.create` / `handle` / `tick` / `debugBundle` are the session API every later task uses.

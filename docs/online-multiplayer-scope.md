# Online Multiplayer — Scope & Design

**Status:** Draft for review (July 2026)  
**Context:** Solo + pass-and-play polish is largely complete. This doc scopes **friends-table online play** across Hearts, Spades, and Euchre before any implementation.

---

## Goals

1. **Friends table over the internet** — 2–4 humans at one table, empty seats filled by AI (optional later: humans-only lobby).
2. **Reuse existing engines** — server applies the same pure reducers in `src/games/*/engine.ts`; no duplicate game logic.
3. **Mobile-first** — phone browsers are primary clients; reconnect after backgrounding matters.
4. **Low friction join** — share a short room code or link; no account required for MVP.

## Non-goals (MVP)

- Ranked matchmaking, ELO, global leaderboards
- Cross-device stats sync / accounts (device-local stats stay local for v1)
- In-game chat, voice, emotes (nice-to-have later)
- Spectators
- Real-money or wagering
- Peer-to-peer without a host (adds cheating surface; defer)

---

## What we already have (assets)

| Asset | Why it helps |
|-------|----------------|
| Pure engine reducers | Server can `applyAction(state, action) → newState` deterministically |
| `getLegalForHuman(state, seat)` | Server-side move validation |
| Serializable `*State` types | Room snapshots, reconnect payloads |
| `GameModule` registry | One multiplayer adapter per game |
| `passAndPlay` seat model | Conceptual map: `humanSeats` → connected players per seat |
| Phase + `whoseTurn` | Natural turn gate; only one seat acts at a time (Hearts pass is multi-step — see below) |

## What we lack (must build)

| Gap | Notes |
|-----|-------|
| Transport | WebSocket (or SSE + POST) between client and room server |
| Room / lobby | Create, join, seat pick, start match |
| **Authoritative server** | Holds full state; clients never see opponent hole cards |
| **Per-client projection** | Strip `hand[]`, pass secrets, kitty before reveal |
| **`mySeat` session** | Replace hardcoded seat `0` / `uiSeat` in stats, achievements, animations |
| **Online game hook** | Parallel to `useHeartsGame` — apply remote state, send actions |
| Auth (minimal) | Display name + optional avatar; room token for reconnect |

---

## Recommended architecture

### Server-authoritative room host

```
┌─────────────┐     WS      ┌──────────────────┐     WS      ┌─────────────┐
│  Client A   │◄──────────►│  Room Server     │◄──────────►│  Client B   │
│  (seat 0)   │  projected │  full game state │  projected │  (seat 2)   │
└─────────────┘   state    │  + engine apply  │   state    └─────────────┘
                           └──────────────────┘
                                    │
                           AI seats: server runs
                           runAiTurn when whoseTurn
                           is AI and humans idle
```

**Why not P2P:** Hole cards and pass selections must stay secret. A host peer could cheat; a small room server is simpler to trust and debug.

**Why not CRDT/sync full state to all clients:** Current state includes all four hands. Projection is mandatory.

### Action protocol (minimal)

Clients send **intent**; server validates seat + legality, applies engine function, broadcasts **events** + **projected state**.

```ts
// Shared envelope
type ClientMessage =
  | { type: 'join_room'; code: string; name: string }
  | { type: 'create_room'; gameId: GameId; rules: RoomRules }
  | { type: 'pick_seat'; seat: Seat }
  | { type: 'ready' }
  | { type: 'game_action'; action: GameAction }

type GameAction =
  // Hearts
  | { type: 'toggle_pass_card'; cardId: string }
  | { type: 'confirm_pass' }
  | { type: 'accept_received' }
  | { type: 'play_card'; cardId: string }
  // Spades
  | { type: 'submit_bid'; bid: number; nil?: boolean; blindNil?: boolean }
  | { type: 'play_card'; cardId: string }
  // Euchre
  | { type: 'pass_bid' }
  | { type: 'order_up' }
  | { type: 'name_trump'; suit: Suit }
  | { type: 'discard'; cardId: string }
  | { type: 'go_alone' | 'with_partner' }
  | { type: 'play_card'; cardId: string }
  // Table
  | { type: 'next_hand' }  // host-only or unanimous — TBD
```

Server responses:

```ts
type ServerMessage =
  | { type: 'room_state'; room: RoomMeta; players: PlayerMeta[] }
  | { type: 'game_snapshot'; view: ProjectedGameState; seq: number }
  | { type: 'game_event'; event: AnimationEvent; seq: number }  // trick played, bid locked, etc.
  | { type: 'error'; code: string; message: string }
```

**Event sourcing (optional v2):** Log actions + seq; clients catch up on reconnect. MVP can resend full projected snapshot on reconnect.

### State projection

```ts
function projectForSeat(full: HeartsState, mySeat: Seat): HeartsProjected {
  return {
    ...full,
    players: mapValues(full.players, (p, seat) => ({
      ...p,
      hand: seat === mySeat ? p.hand : [],           // count-only via cardCount
      selectedPass: seat === mySeat ? p.selectedPass : [],
    })),
    receivedCards: mySeat === full.whoseTurn ? full.receivedCards : [],
    passSelections: {},  // never leak pre-exchange
  }
}
```

Similar rules for Spades (hands hidden) and Euchre (kitty/upcard timing, discard secrets).

### Seat model & UI rotation

- **Compass is fixed in engine:** 0=South, 1=West, 2=North, 3=East.
- **MVP UI:** Keep compass fixed; only **hand footer** follows `mySeat` (today `uiSeat` / `you`).
- **v2 polish:** Rotate table so `mySeat` is always south (requires mapping seat → screen position in `PlayerSeat`, `CardFlight`, `TrickArea`).

Replace throughout:

| Today | Online |
|-------|--------|
| `players[0]` = human in stats/achievements | `players[mySeat]` or account-less “this match” stats only |
| `partnershipOf(0)` for “your team” | `partnershipOf(mySeat)` |
| `PassDeviceBanner` | Remove in online mode |
| `applyHumanSeats(prefs)` | Room roster: `{ seat, playerId, isConnected }` |
| `use*Game` local `useState` | `useOnlineGame` + snapshot from server |
| AI timers in client hook | Server schedules AI turns (or host client — avoid for MVP) |

---

## Hearts-specific: passing online

Pass-and-play runs humans **sequentially** with `PassDeviceBanner`. Online:

1. When `phase === 'passing'`, each human submits 3 cards **in parallel** (UI like today, but no device handoff).
2. Server collects all four pass selections (AI auto-picks via `choosePassCards` immediately).
3. Server runs `finalizePassExchange` once; projects `receiving` per seat with only that seat’s `receivedCards`.
4. Each human calls `accept_received` when ready; server merges into hand.

`whoseTurn` during passing can stay per-seat for UX (“Angie is passing”) or be relaxed to “any human may pass until all submitted” — prefer **parallel pass** with a lobby status bar.

---

## Phased delivery

### Phase 0 — Foundations (no UI yet)
**Estimate:** 1 PR, ~3–5 days

- [ ] `src/multiplayer/types.ts` — Room, Player, GameAction, ProjectedState
- [ ] `projectState(gameId, fullState, mySeat)` per game
- [ ] `applyGameAction(gameId, state, action, seat)` — thin wrapper over existing engine exports
- [ ] Unit tests: projection never leaks opponent `hand`; illegal actions rejected

### Phase 1 — Room server MVP (Spades only)
**Estimate:** 2–3 PRs, ~1–2 weeks

Spades is the simplest online fit: no passing, simultaneous bids sequential, well-tested AI.

- [ ] Node/Bun WebSocket server package (`server/` or separate repo)
- [ ] Create/join room, 4-char code, seat picker
- [ ] Spades loop: bid → play → hand result → next hand
- [ ] Server-run AI for empty seats
- [ ] Client: `useOnlineSpadesGame`, lobby screen, connection status
- [ ] Reconnect: same room code + player token → re-seat

**MVP success:** Two phones, two humans, two AI, finish a Spades match.

### Phase 2 — Hearts online
**Estimate:** 2 PRs

- [ ] Parallel pass submission + receive flow
- [ ] Remove `PassDeviceBanner` when `mode === 'online'`
- [ ] Racing/auto-finish: server flag or host setting

### Phase 3 — Euchre online
**Estimate:** 2 PRs

- [ ] Bidding rounds, discard, loner choice as distinct actions
- [ ] Kitty/upcard visibility rules in projection
- [ ] Stick-the-dealer enforced server-side

### Phase 4 — Polish & parity
**Estimate:** 1–2 PRs

- [ ] Table rotation (mySeat always south)
- [ ] Spectator-less “friend invite” link (`?room=ABCD`)
- [ ] Pause/disconnect grace period (60–90s); AI sub if not back
- [ ] Settings: online-specific name/avatar (not per-seat local prefs)

### Phase 5 — Optional later
- Accounts + cloud stats
- Chat / reactions
- Private rules room config UI (already in prefs — hoist to room)

---

## Server technology options

| Option | Pros | Cons |
|--------|------|------|
| **Bun/Node + `ws`** | Full control, engines run in TS directly | You operate/deploy it |
| **PartyKit / Cloudflare Durable Objects** | Managed rooms, good reconnect story | Vendor lock-in, cold starts |
| **Colyseus** | Game room patterns built-in | Heavier; learn framework |
| **Supabase Realtime + Edge Functions** | Auth/storage path later | Awkward for authoritative game loop |

**Recommendation for this codebase:** Start with **`server/` monorepo** — Bun or Node, TypeScript, import engines from `src/games/*` via shared workspace path. Deploy to Fly.io, Railway, or a $5 VPS. One process per room (or Durable Object later).

---

## Client changes (summary)

### New modules
- `src/multiplayer/client.ts` — WebSocket client, reconnect, seq tracking
- `src/multiplayer/project.ts` — client-side sanity (server is source of truth)
- `src/hooks/useOnlineGame.ts` — generic; delegates to game-specific action mappers
- `src/components/Lobby.tsx` — create/join, seat grid, ready button
- `src/components/ConnectionBanner.tsx` — offline / reconnecting

### Refactors (can be incremental)
1. Introduce `GameMode = 'local' | 'passAndPlay' | 'online'` in prefs or match meta
2. Extract `mySeat` into a React context (`SeatSessionProvider`)
3. Replace `state.players[0].hand.length === 0` final-trick checks with `state.players[any].hand.length === 0` or `phase` flag
4. Gate achievements/stats on online matches: **match-local only** for MVP (no career credit) OR credit `mySeat` only — product decision

---

## Security & cheating

- Server validates every action with `getLegalForHuman` / engine guards
- Rate-limit actions per seat
- Room code + signed reconnect token (HMAC, short TTL)
- Never send opponent hands in WS payload
- Log action seq for dispute/debug

---

## Open decisions (need your call)

1. **Empty seats:** AI-fill immediately vs wait for humans vs start at 2+ humans?
   - *Recommendation:* AI-fill at start; allow 2-human + 2-AI.

2. **Who starts next hand?** Any player taps Next vs host only vs auto-advance after N seconds?
   - *Recommendation:* Auto-advance after 3s on hand result (matches solo flow).

3. **Online stats:** Count toward career stats or separate “online” bucket?
   - *Recommendation:* MVP = no career stats from online; avoids `mySeat` migration in achievements.

4. **Rules:** Room host picks rules at create, or per-player prefs?
   - *Recommendation:* Host rules snapshot in room; clients display read-only.

5. **Deployment:** Same GitHub Pages frontend + separate API URL env var?
   - *Recommendation:* Yes — `VITE_WS_URL=wss://...` at build time.

---

## PR plan (when implementation starts)

```
PR-1  multiplayer/types + projectState + applyGameAction tests
PR-2  server scaffold (WS, room CRUD, heartbeat)
PR-3  Spades online loop (server)
PR-4  Lobby UI + useOnlineSpadesGame (client)
PR-5  Reconnect + connection banner
PR-6  Hearts pass flow online
PR-7  Euchre online
PR-8  Seat rotation + invite links
```

PR-1 through PR-5 constitute a **shippable Spades friends beta**.

---

## Testing strategy

- **Engine-level:** projection + action application (vitest, no network)
- **Server integration:** scripted 4-seat simulation with mock WS clients
- **Manual:** two-browser playbook (Chrome + phone, or two profiles)
- **Regression:** all existing solo/pass-and-play tests stay green; `GameMode.local` unchanged

---

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep (3 games at once) | Ship **Spades online first** |
| Animation desync | Server sends `game_event`; clients animate; snapshot is truth after animation |
| Hearts pass timing | Parallel pass collection; don’t port sequential `whoseTurn` pass UX literally |
| Achievement/stats seat-0 debt | Defer online career credit to Phase 5 |
| Hosting cost | Rooms are short-lived; idle timeout closes room |

---

## Next step when you’re ready

1. Confirm open decisions (especially AI-fill and online stats).
2. Implement **PR-1** (types + projection + tests) — no server yet, unblocks everything.
3. Stand up minimal WS server locally; two browser tabs against Spades.

*While you playtest tonight, note anything that would feel wrong in async online play (slow bids, unclear whose turn, hand-end pacing). Those map directly to Phase 4 polish or protocol tweaks.*
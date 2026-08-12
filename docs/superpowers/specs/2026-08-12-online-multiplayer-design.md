# Online multiplayer — friends tables

**Status:** Approved for spec review  
**Date:** 2026-08-12  
**Supersedes:** `docs/online-multiplayer-scope.md` (July 2026 draft)

Destination product is **C**: all three games, accounts, table chat, and matchmaking. This spec is the first playable slice plus the room model later slices plug into. Implementation is sequenced; nothing in slice 1 assumes accounts or chat exist.

---

## 1. Goal

Friends sit at one real-time table in the browser (phones first), play **Hearts, Spades, or Euchre**, and see only their own cards. Solo vs AI and pass-and-play stay as they are.

**Slice 1 is done when:** two phones can create/join a room, arrange seats, agree to fill empty chairs with AI, and finish a match in any of the three games, including reconnect after backgrounding.

### Non-goals (slice 1)

- Accounts, passwords, cloud career stats
- In-table chat, voice, emotes
- Public matchmaking / ranked / ELO
- Spectators (except a player who was replaced by AI after a timeout)
- Peer-to-peer hosting
- Real-money play

### Later slices (same rooms)

| Slice | Adds |
|-------|------|
| 2 | Accounts (`playerId`), online stats |
| 3 | Table chat on the existing WebSocket |
| 4 | Public “find a table” queue that creates the same room type |

---

## 2. Product

### 2.1 Create and join

- Home (or game picker) gets **Play with friends**.
- Creator picks **Hearts / Spades / Euchre**, a **display name**, and a **house-rules snapshot** (copy of current prefs for that game). Those rules are frozen for the match.
- Creator receives a **4-character room code** (Crockford alphabet, no `0/O/1/I`) and a share link `?room=K7QM`. On collision, the server retries with a new code.
- Joiners enter the code or open the link, set a display name, and enter the lobby. No account.

Reconnect identity is a **player token** minted on first join, stored in `sessionStorage` (and `localStorage` keyed by room code) so a refresh or app-switch comes back as the same person.

### 2.2 Lobby seats

Four chairs: South, West, North, East. Engine seats stay `0/1/2/3` with the existing compass. Online UI **rotates** so *you* are always drawn as South. Spades/Euchre partner is then always North on your screen.

- Creator is seated South (engine seat 0) on create. Joiners are seated in the first empty chair (1, then 3, then 2) so two friends default to **opponents** until they move. Anyone may stand or retake an empty chair before start.
- **Tap an empty chair** to sit there; your previous chair becomes empty.
- **Spades and Euchre only:** **Partner with [name]** sits you across from them; **Sit against [name]** sits you beside them (west of them if free, else east). If the needed chair is occupied, the client sends `swap_request` to that sitter instead of failing silently.
- Hearts has no partnership shortcuts — chairs only.
- If all four chairs are human and two people want to trade, either sends **Swap seats?** The other accepts or declines. Pending swap expires when anyone stands or the match starts.
- Names and connection dots show on chairs. Empty chairs read “Empty”.

Creator is **host** only for “which game / which rules.” Host leaving does not close the room.

### 2.3 Starting the match

Empty chairs stay empty until **every currently seated human** taps **Fill remaining seats with AI**.

- Votes are per seated human, not per chair.
- If the seated set changes (sit, stand, join, leave, swap), **all fill-AI votes reset**.
- A lone host can approve fill-AI alone (three bots).
- Euchre allows 3 humans + 1 AI the same way as 2+2 or 1+3.
- **Start game** is enabled only when every chair is a human **or** an approved AI seat.
- After start, seats and human/AI assignment are locked for the match (except the disconnect replace flow in §5).

AI difficulty for filled seats: host’s current default for that game (same as solo).

### 2.4 During play

- Only the seat whose turn it is may send a game action (Hearts passing is the exception — §4.3).
- Others see the existing-style “waiting on …” / your-turn treatment.
- Hand recaps auto-advance after **3 seconds** (same idea as solo). Match-over stays until someone taps **Rematch** (host starts a new match in the same room, same seats) or **Leave**.
- Online matches **do not** write local career stats, goals, or achievements in slice 1.

### 2.5 Modes

`GameMode = 'local' | 'passAndPlay' | 'online'`.

Local and pass-and-play keep today’s hooks and seat-0-as-you behavior. Online uses a separate hook and never mounts `PassDeviceBanner`.

---

## 3. Architecture

### 3.1 Why a server

Full engine state includes all four hands. Broadcasting that would leak cards. A host peer could cheat. The room server is authoritative.

### 3.2 Where it runs

**One Cloudflare Durable Object per room**, fronted by a Worker.

```
Phone A  ──WebSocket──┐
Phone B  ──WebSocket──┼── Worker (route by room code) ── Durable Object (table)
Phone C  ──WebSocket──┘         │
                                ├── full HeartsState | SpadesState | EuchreState
                                ├── lobby roster, votes, tokens
                                └── runAiTurn when an AI seat must act
```

- GitHub Pages keeps serving the Vite app.
- Client uses `VITE_WS_URL` (build-time) to open `wss://…/room/K7QM`.
- The DO hibernates between plays (good for thinking time and phones in the background).
- Idle room with zero connections **destroys itself after 10 minutes**.

The Worker imports the same TypeScript engines as the app (`src/games/*/engine.ts`). No second rules implementation.

### 3.3 Process split

| Unit | Responsibility |
|------|----------------|
| `src/multiplayer/protocol.ts` | Message types shared by client and Worker |
| `src/multiplayer/project.ts` | `projectForSeat(gameId, state, seat)` — never leaks foreign hands |
| `src/multiplayer/apply.ts` | `applyGameAction(gameId, state, action, seat)` wraps existing engine exports |
| `src/multiplayer/lobby.ts` | Pure lobby reducer: sit, swap, vote fill-AI, start gate |
| `worker/room.ts` | Durable Object: sockets, tokens, AI timers, persist snapshot |
| `worker/index.ts` | HTTP create/join + WebSocket upgrade |
| `src/multiplayer/client.ts` | Browser WS client, reconnect, seq |
| `src/hooks/useOnlineGame.ts` | Projected state → existing table components |
| `src/components/FriendsLobby.tsx` | Create/join, chairs, votes, start |

Solo engines stay the source of truth. `apply.ts` is a thin seat-aware wrapper (`tryPlayCard`, `submitBid`, `passBid`, …). If an engine function assumes `whoseTurn` is the only actor, the wrapper passes that seat and rejects mismatches.

---

## 4. Protocol and game rules on the wire

### 4.1 Client → server

```ts
type ClientMessage =
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
```

`GameAction` is a tagged union of existing engine moves:

- Hearts: `toggle_pass_card`, `confirm_pass`, `accept_received`, `play_card`
- Spades: `submit_bid`, `play_card`
- Euchre: `pass_bid`, `order_up`, `name_trump`, `discard`, `go_alone`, `with_partner`, `play_card`

No client-supplied next-hand. The server auto-advances after the recap delay.

### 4.2 Server → client

```ts
type ServerMessage =
  | { type: 'joined'; token: string; playerId: string; seat: Seat | null }
  | { type: 'lobby'; lobby: LobbyView }
  | { type: 'snapshot'; view: ProjectedState; seq: number }
  | { type: 'event'; event: TableEvent; seq: number }
  | { type: 'error'; code: ErrorCode; message: string; seq?: number }
```

`TableEvent` exists so the client can play the same flights/FX it already has (`card_played`, `trick_won`, `bid_locked`, `pass_done`, …). After animations, `snapshot` is truth.

`ProjectedState` is the real engine state with secrets stripped (§4.4).

### 4.3 Hearts passing (online)

Today’s engine walks humans **one at a time** for pass-and-play. Online does **not** reuse that UX.

1. When `phase === 'passing'`, every human may `toggle_pass_card` / `confirm_pass` in parallel. The room stores `passSelections[seat]` itself if the engine is still sequential.
2. AI seats run `choosePassCards` as soon as the hand is dealt.
3. When every human seat has confirmed, the server runs the existing finalize/exchange once.
4. Each client’s snapshot includes `receivedCards` **only for that seat**. `accept_received` is per human; the server merges that seat, then starts play when all humans have accepted (AI receives are applied immediately).

Slice 1 may add a small engine helper (e.g. `confirmPassForSeat(state, seat)` / `acceptReceivedForSeat`) so online does not fake `whoseTurn`. Pass-and-play keeps the sequential path.

### 4.4 Projection (must never leak)

For every game, for viewer `mySeat`:

- `players[s].hand` is the real hand iff `s === mySeat`, else `[]` plus `cardCount`.
- Hearts `selectedPass` and `passSelections` are visible only for `mySeat` (and never after exchange).
- Hearts `receivedCards` / `pendingReceives` only for `mySeat`.
- Euchre kitty/upcard follow current solo visibility (hidden until the existing reveal phases).
- Dealer/maker/loner/sitting-out stay public.

Unit tests assert a projected payload string-searched for every foreign card id is empty.

### 4.5 AI turns

When `whoseTurn` is an AI seat (or Hearts auto-pass/receive for AI), the DO waits **700–1200ms**, calls the existing `runAiTurn` / pass helpers, then broadcasts. Difficulty is whatever was copied onto that seat at fill time.

---

## 5. Disconnects and errors

### 5.1 Lobby

Disconnected sitter: **30s** grace, then `stand` (chair empty, fill-AI votes reset). Reconnect with the same token within 30s restores the chair.

### 5.2 In match

On that player’s turn the table **pauses** (no AI, no auto-play). Banner: “[Name] is reconnecting…”. **90s** to resume the same seat and hand via token.

If time runs out:

- Remaining humans see **Replace with AI**. Same unanimous rule as lobby fill (every remaining human must approve).
- On approve, that seat becomes AI for the rest of the match. The player may reconnect as a **spectator** for that match only (projected as if they still sat there for scores, but they cannot act). They do not steal the seat back mid-match.
- If **no humans remain**, the room stops AI and closes after the idle timeout. No bot-vs-bot.

Host disconnect does not end the match.

### 5.3 Errors

| Situation | Behavior |
|-----------|----------|
| Not your turn / illegal card | `error`, state unchanged, last snapshot re-sent |
| Duplicate `clientSeq` | Ignore; last snapshot |
| Unknown token | New `playerId`; cannot reclaim an in-match seat |
| Rate limit (burst of actions) | `error` `rate_limited` |
| Room full (4 humans, no empty chair) | Join as rejected; message to create or wait |

The client never applies a guessed fix. It only renders server snapshots.

Room codes are for friends, not a fortress. Slice 2 (accounts) can add private rooms.

---

## 6. Client integration

- **SeatSession:** online `mySeat` comes from the room; table components that assume seat `0` is you must take `mySeat` (rotation helper maps engine seat → screen slot).
- **Tables:** reuse `Hearts` / `Spades` / `Euchre` tables with projected state. Disable local AI timers and local `runAiTurn`.
- **Undo:** disabled online.
- **Save/resume:** local IndexedDB save is not used for online matches; the DO snapshot is the save.
- **Invite:** lobby shows copy-code and share (Web Share API when present).

---

## 7. Security

- Every `game_action` validated with `getLegalForHuman` / engine guards for **that seat**.
- Never put opponent hands, pass picks, or Euchre unrevealed kitty in a projected payload.
- Tokens are unguessable (128-bit random). Room code alone is not enough to impersonate a seated player.
- CORS / WS origin allowlist for the Pages host plus localhost.

---

## 8. Testing

- **Vitest, no network:** `project.ts` leak tests (all three games, including Hearts mid-pass); `apply.ts` illegal action rejected; `lobby.ts` start gate, vote reset on sit/stand, partner/opponent seat math, swap.
- **Worker tests:** scripted two mock clients + two AI finish one hand each game; reconnect restores seat + hand; replace-with-AI after 90s (timer injected).
- **Manual:** two browser profiles (or phone + desktop) through lobby → Spades, Hearts (parallel pass), Euchre (order/name trump).
- **Regression:** existing solo / pass-and-play / e2e stay green. `GameMode.local` paths untouched except shared components accepting `mySeat`.

---

## 9. Implementation order (slice 1)

Still one product, several PRs so each is testable:

1. Shared protocol + `project` + `apply` + lobby reducer + tests (no Worker UI).
2. Worker + Durable Object: create/join, lobby messages, hibernation.
3. Client lobby UI + WS client (no cards yet).
4. Spades online loop (simplest in-match).
5. Hearts online (parallel pass + receive).
6. Euchre online (bid / discard / loner / kitty projection).
7. Reconnect banner, 90s pause, replace-with-AI, rematch, share link.

PRs 1–7 are the friends beta. Accounts / chat / matchmaking are **not** in those PRs.

Engine helpers for parallel Hearts pass land in PR 5, with pass-and-play tests proving sequential behavior is unchanged.

---

## 10. Decisions (locked)

| Topic | Decision |
|-------|----------|
| Destination | Full product (games + accounts + chat + matchmaking), sequenced |
| First playable | All three games, friends rooms, no accounts |
| Empty seats | Unanimous fill-AI among seated humans, then Start |
| Seats | Tap empty chair; partner/opponent shortcuts; swap if full |
| Hosting | Cloudflare Durable Object per room; Pages stays static |
| Stats | No career write from online until accounts |
| Next hand | Server auto-advance after 3s recap |
| Rules | Host snapshot at create |
| Identity (slice 1) | Display name + reconnect token |

No remaining slice-1 ambiguities. Chat wording, account provider, and matchmaking rules belong in later specs.

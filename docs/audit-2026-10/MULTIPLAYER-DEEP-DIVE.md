# Multiplayer deep dive — 27 Oct 2026

Walked on `main` at `3732e9d` (package `0.3.99`) with a local Vite app and a local Worker. Two browser contexts, Hearts, Spades, and Euchre, at 390×844 and 1280×800. Kitchen rules. This is after #50–#53 (lobby roster, turn status, away copy, rematch sheet). Those passes are left as they are.

Screenshots in this table are the before shots in `docs/releases/0.3.100/`.

| ID | Sev | Game | Step | Width | What happened | Shot | Proposed fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | All | Bad code | 390 | Code `ZZZZ` says there is no table, then still shows the code, Copy/Share/SMS, four seats, the turn limit, and Waiting for the host. The only way out, Join a different table, measures 159×24. | `before-390-hearts-bad-code.png` | Replace that state with one alert and a full-size Back home. Do not draw a table. |
| 2 | P1 | All | Away | 390 | “Ben stepped away…” wraps into a 138px banner, then Seat held, then a second Time left bar. | `before-390-hearts-away.png`, `before-1280-hearts-away.png` | One line, plus the Seat held pill. Keep the existing reconnect backoff. |
| 3 | P1 | Spades, Euchre | Seating | 390 | “You are South. Partner is North — a bot will sit.” paints across the south seat. | `before-390-spades-lobby-guest.png`, `before-390-euchre-lobby-guest.png` | One short line above the felt: you and North are partners. |
| 4 | P1 | All | Bots | 390 | Empty chairs are tagged AI. At the table the same chairs say Med. Other copy says computer. | `before-390-hearts-lobby-host.png`, `before-390-spades-turn.png` | Use the word Computer on empty lobby chairs, the partner line, and the watching line. |
| 5 | P1 | All | Invite | 390, 1280 | Copy, Share, and SMS are three identical ghost buttons. | `before-390-hearts-lobby-host.png`, `before-1280-hearts-lobby-host.png` | Share is the gold button. SMS opens the message app as a link. |
| 6 | P1 | All | Waiting | 390 | A guest’s turn-limit buttons are disabled and look tappable. Nothing says only the host can change them. | `before-390-hearts-lobby-guest.png` | One line: the host sets the turn limit. |
| 7 | P1 | All | Create | — | A paused-rooms response (503) is thrown away and shown as “Table server is unavailable.” | Code in `createRoom.ts`. No live kill switch in this walk. | Repeat the server’s paused and too-many-rooms sentences. Same one POST. |
| 8 | P2 | All | Join | 390 | The code field allows 6 characters and has no Go key. Codes are 4 characters from a mixed alphabet, so the text keyboard is the right one. | `before-390-home-join.png` | Limit the field to 4 and set the Go key. |
| 9 | P2 | Spades, Euchre | Hand end | — | Hand rows are names only. Hearts standings already have a portrait and a 12px gap (#53). | Not shot this walk. | Left open. A portrait pass does not fit this diff. |
| 10 | P2 | All | During play | 390 | Computer seats show Med / MED, and the two sizes do not match. | `before-390-spades-turn.png`, `before-390-euchre-turn.png` | Left open. Solo still uses that badge for difficulty. |
| 11 | P2 | All | Match end | — | Rematch starter, moon copy, and the phone hit-test already shipped in #53. Not re-walked to a race finish. | `e2e/match-end-host.spec.ts` | Left open. Do not rebuild it. |

## Already in good shape

- The roster line names who is here and who deals (#50). Seat controls on a live lobby are at least 44px. Deal now and Waiting for the host are obvious.
- Pass direction, bidding, and the trump call each have one status line, and Time left is one bar (#51).
- A dropped seat is held, a second card tap is blocked, and reconnect waits at least a second (#52).
- Guests are told who starts the rematch, and the match sheet sits above the table (#53).
- Last-room rejoin is on Home. A bad code’s words are already clear. The failure is the screen around them.
- No horizontal scroll at 390 on the screens that were measured.

## Rank

Fix 1 through 7, and the small join-field part of 8. Leave 9, 10, and 11.

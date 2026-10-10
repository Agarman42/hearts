# Build log

Times are US Eastern. The live site is https://agarman42.github.io/hearts/. The live Worker is `wss://cardparlour.cardparlour.workers.dev`.

## Releases

| When (ET) | Version | PR | Merge commit | What shipped | Live smoke |
| --- | --- | --- | --- | --- | --- |
| 2026-10-09 7:34 PM | 0.3.67 | #15 | `afe7670` | If a phone stays gone past the seat hold, a bot sits that chair and the player can take it back. The host chair passes to the next person. Home stamp `v0.3.67 · build 2026.10.09.2334`. | Pass. Home at 390 and 1280 showed that stamp. One trick each in Hearts, Spades, and Euchre. Room VG83: host and guest both entered the hand. |
| 2026-10-09 7:26 PM | 0.3.66 | #14 | `3f5daf6` | A phone that drops out keeps its seat for five minutes, and the app reconnects as soon as the socket returns. A refresh during a Hearts pass comes back to that hand. Home stamp `v0.3.66 · build 2026.10.09.2324`. | Pass. Home at 390 and 1280 showed that stamp. One trick each in Hearts, Spades, and Euchre. The Hearts pass tip stayed clear of the pass button. Room FC6W: host and guest both entered the hand. |
| 2026-10-09 7:11 PM | 0.3.65 | #13 | `1b8c7ff` | The version stamp, Host, Join, and all three games fit on the first phone screen. Blurbs wrap instead of truncating, and Join stays on a 360px screen. Home stamp `v0.3.65 · build 2026.10.09.2310`. | Pass. Home at 390 and 1280 showed that stamp. One trick each in Hearts, Spades, and Euchre. The Hearts pass tip stayed clear of the pass button. Room NHPB: host and guest both entered the hand. |
| 2026-10-09 6:54 PM | 0.3.64 | #12 | `447985b` | When stick-the-dealer forces the dealer to name trump, Pass is hidden and the panel says you have to name trump. Ordinary bids still have Pass. Home stamp `v0.3.64 · build 2026.10.09.2253`. | Pass. Home at 390 and 1280 showed that stamp. One trick each in Hearts, Spades, and Euchre. The Hearts pass tip stayed clear of the pass button. Room 2SMX: host and guest both entered the hand. |
| 2026-10-09 6:42 PM | 0.3.63 | #11 | `4a09569` | A 13-card hand stays on a phone, including the tilted card at the right. Home stamp `v0.3.63 · build 2026.10.09.2242`. | Pass. Home at 390 and 1280 showed that stamp. The rightmost Hearts card ended at 340px on a 360px screen. One trick each in Hearts, Spades, and Euchre. Room BTQD: Ada and Bea both sat. |
| 2026-10-09 6:29 PM | 0.3.62 | #10 | `69f499e` | The host can deal a friends table immediately. Empty chairs play as the computer. The first Hearts tip explains the pass and leaves the pass button free. Home stamp `v0.3.62 · build 2026.10.09.2230`. | Pass. Home at 390 and 1280 showed that stamp. One trick each in Hearts, Spades, and Euchre. Room 5TRB: Ada and Bea both sat, the host dealt, and both entered the hand. |
| 2026-10-09 6:07 PM | 0.3.61 | #9 | `a76d853` | Current-state audit, pull-request workflow in AGENTS.md, and a fix for the e2e suite aborting after a second home navigation. Home stamp `v0.3.61 · build 2026.10.09.2206`. | Pass. Home at 390 and 1280 showed that stamp. One trick each in Hearts, Spades, and Euchre against the computer. Friends room 3BV4: host and guest both saw the same code. |
| 2026-09-15 7:14 PM | 0.3.60 | none (direct to main) | `618f6aa` | Full Spades bid pad on first paint. This is the build that was live at the start of the Oct 2026 audit (`build 2026.09.15.2315`). | Pass, checked 2026-10-09: Home HTML last-modified 15 Sep 2026 23:16 GMT, bundle contains `0.3.60` and `2026.09.15.2315`. |

Older history is the git log. Many of those commits were pushed straight to `main` before this pull-request workflow. They are not re-listed here.

Rows from this workflow are added when the PR merges and the live smoke test finishes.

## Needs Adam

These are the only things this run will not do by itself.

1. **Pick a brand and a domain.** The app is "Card Parlour" in the UI and `cardparlour` on the Worker. No domain is configured. When you pick one, the note will say what to buy and where to point DNS. A few minutes at the registrar, nothing to type into chat.
2. **Say whether the painted pictures can stay.** `public/cards/back.jpg`, `public/textures/wood.jpg`, `public/textures/damask.jpg`, and the 32 files in `public/characters/` have no license in the repo and no EXIF. They landed in the first commit on 9 Jul 2026. A yes keeps them. A no means they get replaced with free art. No click until that question is in front of you.
3. **Confirm the Cloudflare plan.** The room Worker uses a SQLite Durable Object. This audit did not open the Cloudflare dashboard, so Free vs Paid is unknown. Do not change the plan from here. If you want it checked, open the Workers plan page for the account that owns `cardparlour`. About two minutes.
4. **Open the cardparlour Worker logs.** As of about 8:01 PM ET on 9 Oct 2026, a real create (`POST /rooms` with `gameId` and `name`) returns Cloudflare error 1101. A bad body still returns 400, and the local Worker still creates rooms. The last live room that worked was VG83 at 7:34 PM ET, right after 0.3.67. Nothing has been deployed since. Open Workers & Pages, pick the `cardparlour` Worker, and read the error at the top of the log. About five minutes. Do not change the script, the plan, or any secret from here. A new version stays unmerged until create works again.

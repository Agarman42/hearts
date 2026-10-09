# Build log

Times are US Eastern. The live site is https://agarman42.github.io/hearts/. The live Worker is `wss://cardparlour.cardparlour.workers.dev`.

## Releases

| When (ET) | Version | PR | Merge commit | What shipped | Live smoke |
| --- | --- | --- | --- | --- | --- |
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

# Agent notes

## Git / deploy

Every change goes through a pull request. Do not commit or push directly to `main`.

1. Branch from current `origin/main`. One concern per PR. Keep the diff under about 600 lines. Stack a bigger feature as separate PRs, and start the next PR only after the current one is merged, deployed, and smoke-tested live.
2. Open the PR as a draft. When `npm test`, lint, build, and e2e all pass (and `npm run sim:all` for gameplay changes) and any UI screenshot polish is done, mark it ready and squash-merge it yourself.
3. A merge to `main` is the only deploy. `.github/workflows/deploy.yml` tests, deploys the Worker, builds, runs e2e, and publishes GitHub Pages. Do not run `wrangler deploy` by hand. Do not change Cloudflare, GitHub Pages, DNS, secrets, or repo settings.
4. After each merge, watch that workflow to green. If it fails, fix it in a new PR right away, or revert if the Worker deployed and the site did not. Then smoke-test live at https://agarman42.github.io/hearts/ and `wss://cardparlour.cardparlour.workers.dev`. If the live game is broken, revert that squash commit through its own PR immediately.
5. Smoke test: Home loads and `.home__version` shows the new version; play at least one trick of Hearts, Spades, and Euchre against the computer; create an online room and join it from a second browser context so both see the lobby.
6. Bump `package.json` on every PR so the Home stamp shows what is live.
7. Log each release in `docs/BUILD-LOG.md`: date and time ET, version, PR number, merge commit, one line, and the live smoke result.
8. The Worker must keep working with the previous client protocol for at least one release. Phones cache the old client. Add a protocol version on hello and a polite "Update available, tap to refresh" path. Never ship a Worker change that breaks the version currently live.
9. Skip junk: `tsconfig*.tsbuildinfo`, `node_modules/`, `dist/`, secrets, tokens. No secrets in the repo, logs, or PR text.
10. Auth: if a push needs a token, start it and let Adam type the token in his own terminal. Never ask him to paste a token into chat.

## Product

Mobile-first Hearts, Spades, and Euchre, solo and with friends. Prefer polish that ships on a phone. Keep the multi-game architecture light.

No real charges. Stripe stays in test mode until Adam turns a live switch on. No emails, posts, ads, or outreach. No chat or free-text messaging between players. No pay-to-win, gambling, wagering, or loot boxes. Collect no personal data beyond an optional display name until Adam approves the privacy policy.

Anything only Adam can do (domain, prices, legal approval, live payments, an ad network, an email sender, secrets) goes under Needs Adam in `docs/BUILD-LOG.md` in plain language. Keep working on something else.

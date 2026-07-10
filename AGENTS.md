# Agent notes

## Git / deploy

When the user wants changes on GitHub or deployed (Pages):

1. **Do it yourself** — stage relevant files, write a good commit message, `git commit`, and `git push origin main` (or the current branch).
2. **Do not** only paste command lists for the user to run, unless they explicitly ask for commands only.
3. **Skip** junk: `tsconfig*.tsbuildinfo`, `node_modules/`, `dist/`, secrets, tokens.
4. **Auth:** if push needs a token/login, start the push (or tell them to run only `git push`) and let **them enter the token in their own terminal**. Never ask them to paste a token into chat. Never store tokens.
5. After push, point them at Actions + the Pages URL when relevant.

## Product

Mobile-first Hearts (solo vs AI). Prefer polish that ships on phone; keep multi-game (Spades/Euchre) architecture light until Hearts is solid.

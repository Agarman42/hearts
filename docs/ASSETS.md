# Assets

What is in the app, and what we know about its license. Unknown means the repo has no license file and no EXIF. Those pictures stay until Adam says yes or no. See Needs Adam in `docs/BUILD-LOG.md`.

## Sound

There are no audio files. Card, shuffle, and win cues are short tones synthesized in `src/fx.ts` when the player turns Sound on. They are original to this repo. Sound is off on a first visit. A cue plays only after a tap or a keypress in that visit, and only while Sound is on.

## Fonts

`index.html` loads Fraunces and Plus Jakarta Sans from Google Fonts. The stylesheet is `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap`. The font files are not copied into this repo. Their published terms were not re-downloaded for this note.

## Pictures drawn here

`public/icons/icon.svg` is an original drawing in this repo. The PNG icons next to it are rasterized from that SVG by `scripts/generate-icons.mjs`.

## Pictures with no license in the repo

| File | What we know |
| --- | --- |
| `public/cards/back.jpg` | First commit, 9 Jul 2026. No license, no EXIF. |
| `public/textures/wood.jpg` | Same. |
| `public/textures/damask.jpg` | Same. |
| `public/characters/*.jpg` (32 files) | Same. Used as seat portraits. |

`public/vite.svg` is the Vite starter mark. It is not shown in the game.

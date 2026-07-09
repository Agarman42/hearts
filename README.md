# Hearts

A slick, mobile-first Hearts card game (PWA-ready UI). Play solo against 3 AI opponents with Easy / Medium / Hard difficulty.

## Features

- Classic American Hearts (pass 3, race to 100, shoot the moon)
- No hearts or Queen of Spades on the first trick
- Legal-move highlighting + warning toasts for illegal plays
- Per-hand point tracking for every seat
- Last-trick review
- Configurable rules & AI difficulty in Settings
- Shared card engine laid out for future **Spades** and **Euchre**

## Develop

```bash
npm install
npm run dev
```

Open the local URL Vite prints (default `http://localhost:5173`).

## Deploy (GitHub Pages — shareable link)

This repo includes a GitHub Actions workflow that publishes `dist/` to **GitHub Pages** on every push to `main` / `master`.

### One-time setup

1. Create a GitHub repo (e.g. `hearts`) and push this project:
   ```bash
   git remote add origin https://github.com/YOUR_USER/hearts.git
   git add .
   git commit -m "Hearts card game"
   git push -u origin master
   ```
2. On GitHub: **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions**
3. Wait for the **Deploy to GitHub Pages** workflow to finish (Actions tab).
4. Share the site URL:
   - Project site: `https://YOUR_USER.github.io/hearts/`
   - Or the URL shown under **Settings → Pages**

### Manual deploy (optional)

```bash
npm run build
# upload the dist/ folder to any static host (Netlify, Cloudflare Pages, etc.)
```

`vite.config.ts` uses `base: './'` so assets work on GitHub Pages project URLs.

## Stack

- React 18 + TypeScript + Vite 5
- Pure CSS (no UI kit) for a custom premium table feel
- Game logic isolated under `src/core` and `src/games/hearts` for multi-game reuse

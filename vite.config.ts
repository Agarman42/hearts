/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const root = dirname(fileURLToPath(import.meta.url))

function buildId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}.${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
}

function precacheFromDist(): string[] {
  const assets = new Set(['./', './index.html', './manifest.webmanifest'])
  try {
    const html = readFileSync(join(root, 'dist/index.html'), 'utf8')
    for (const m of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)) {
      assets.add(m[1])
    }
  } catch {
    /* dist missing during dev */
  }
  return [...assets]
}

function injectSwCache(build: string): Plugin {
  return {
    name: 'inject-sw-cache',
    closeBundle() {
      const cacheName = `card-parlour-${pkg.version}-${build}`
      const precache = precacheFromDist()
      const src = readFileSync(join(root, 'public/sw.js'), 'utf8')
      let out = src.replace(/const CACHE = '[^']+'/, `const CACHE = '${cacheName}'`)
      out = out.replace(
        /const PRECACHE = \[[^\]]*\]/,
        `const PRECACHE = ${JSON.stringify(precache)}`,
      )
      writeFileSync(join(root, 'dist/sw.js'), out)
    },
  }
}

const appBuild = buildId()

// https://vitejs.dev/config/
// base './' works for GitHub Pages project sites and local preview
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(appBuild),
  },
  plugins: [react(), injectSwCache(appBuild)],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Allow Cloudflare / localtunnel mobile preview hosts
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 5173,
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'playwright.config.ts'],
  },
})
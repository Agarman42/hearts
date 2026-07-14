/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

function buildId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}.${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
}

// https://vitejs.dev/config/
// base './' works for GitHub Pages project sites and local preview
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(buildId()),
  },
  plugins: [react()],
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
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// base './' works for GitHub Pages project sites and local preview
export default defineConfig({
  base: './',
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
})

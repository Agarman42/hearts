import { defineConfig, devices } from '@playwright/test'

/** Dedicated ports so a leftover preview or Worker cannot be reused. */
const port = 5199
const workerPort = 8799
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npx wrangler dev --local --port ${workerPort} --ip 127.0.0.1 --show-interactive-dev-session=false`,
      url: `http://127.0.0.1:${workerPort}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run build -- --outDir dist-e2e && npm run preview -- --outDir dist-e2e --port ${port} --strictPort --host 127.0.0.1`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_WS_URL: `ws://127.0.0.1:${workerPort}` },
    },
  ],
})
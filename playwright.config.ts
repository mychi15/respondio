import { defineConfig, devices } from '@playwright/test'
import { TEST_FLOW_KEY } from './e2e/constants.js'
import { loadEnvLocal } from './e2e/env.js'

loadEnvLocal()

const PORT = 5190

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Runs against live infra, so allow one retry in CI (also what makes
  // `trace: 'on-first-retry'` actually capture a trace).
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm exec vite --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Always a fresh instance: the e2e app must run with VITE_FLOW_KEY pointed
    // at the test-only blob key, which a reused dev-mode server wouldn't have.
    reuseExistingServer: false,
    env: { VITE_FLOW_KEY: TEST_FLOW_KEY },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

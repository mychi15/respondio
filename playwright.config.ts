import { defineConfig, devices } from '@playwright/test'
import { TEST_FLOW_KEY } from './e2e/constants.js'
import { loadEnvLocal } from './e2e/env.js'

loadEnvLocal()

const PORT = 5190

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
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

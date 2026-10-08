import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const CI = Boolean(process.env['CI'])
// Locally this uses the Chrome that is already installed. In CI, `playwright install chromium`
// provides one and this stays unset.
const channel = process.env['PW_CHANNEL']

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(channel && { channel }) },
    },
    {
      name: 'mobile',
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices['Pixel 7'], ...(channel && { channel }) },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: `http://localhost:${PORT}/healthz`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      // Blank keys mean the server serves its sample articles. Setting them here (to nothing)
      // also stops a developer's own .env from turning these tests into live API calls.
      GUARDIAN_API_KEY: '',
      NYT_API_KEY: '',
      NEWSAPI_API_KEY: '',
      // every test comes from the same address, so the real limit (60 a minute) would block them
      RATE_LIMIT_PER_MINUTE: '100000',
    },
  },
})

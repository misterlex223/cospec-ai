import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Global setup file
  globalSetup: undefined,

  // Timeout for each test
  timeout: 30000,

  // Maximum time for the entire test
  globalTimeout: 60000,

  // Number of retry attempts for flaky tests
  retries: 1,

  // Number of workers (parallel tests)
  workers: 1,

  // Reporter options
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:9280',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video only when retrying a test for the first time
    video: 'on-first-retry',

    // Screenshot option
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        channel: 'chromium',
      },
    },

    {
      name: 'firefox',
      use: {
        channel: 'firefox',
      },
    },

    {
      name: 'webkit',
      use: {
        channel: 'webkit',
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:9280',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
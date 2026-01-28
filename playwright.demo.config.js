// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Simplified Playwright config for demo tests (no local servers)
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  // Test files to run
  testMatch: 'demo.spec.js',

  timeout: 30 * 1000,

  expect: {
    timeout: 5000
  },

  fullyParallel: true,
  retries: 0,

  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No web server for demo
});

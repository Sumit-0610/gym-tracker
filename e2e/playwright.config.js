// Browser tests for the whole app, run the way production runs it: the server
// serves the built client (client/dist) from one origin. Build the client
// first (`cd client && npm run build`); the server is started here on a fresh
// throwaway database so every run begins empty.
const os = require('node:os');
const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT) || 3100;
const baseURL = `http://127.0.0.1:${PORT}`;
const dbPath = path.join(os.tmpdir(), `gym-tracker-e2e-${Date.now()}.db`);

module.exports = defineConfig({
  testDir: './tests',
  // Tests share one server; each signs up its own user, so they can run in
  // parallel without seeing each other's data.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // The app is phone-first; test it in a phone-sized Chromium.
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: 'node ../server/src/index.js',
    url: `${baseURL}/healthz`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DB_PATH: dbPath,
      CLIENT_DIST: path.join(__dirname, '..', 'client', 'dist'),
      TZ: 'Asia/Kolkata',
    },
  },
});

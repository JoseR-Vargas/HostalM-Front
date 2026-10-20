import { defineConfig, devices } from '@playwright/test';

// TEMPORARY visual-regression harness for the CSS -> Tailwind migration (removed in task S4).
// Baselines live in a gitignored folder and are generated from the pre-Tailwind code:
//   npm run e2e:visual:update   (re)creates them
//   npm run e2e:visual          compares the current code against them
// It runs on its own port so it never collides with `npm run e2e` (port 5173); every backend is
// mocked through e2e/support, so nothing leaves localhost.
const APP_URL = 'http://localhost:5180';

export default defineConfig({
  testDir: 'e2e/visual',
  snapshotPathTemplate: 'e2e/visual/__baseline__/{arg}{ext}',
  outputDir: 'test-results/visual',
  fullyParallel: true,
  // The dev server and 4 Chromium instances compete for CPU on a laptop: fewer workers and a roomier
  // screenshot timeout keep slow captures from timing out. Pixel tolerances below are unchanged.
  workers: 3,
  timeout: 60_000,
  // One retry only absorbs infrastructure flakes (a cold Vite dev server reloading the page); a real
  // pixel diff fails again and stays red.
  retries: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list']],
  expect: {
    toHaveScreenshot: {
      timeout: 20_000,
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Cordoba',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    baseURL: APP_URL,
  },
  // `.shots.js` (not `.spec.js`): the main config's testDir is `e2e`, and it must not pick it up.
  projects: [{ name: 'visual', testMatch: /\.shots\.js$/, use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --port 5180 --strictPort',
    url: APP_URL,
    reuseExistingServer: true,
  },
});

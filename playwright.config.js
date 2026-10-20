import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// The same specs run against the original static app (`legacy/`) and the React app to prove
// behavior parity. Every backend is mocked (see e2e/support): nothing ever leaves localhost.
const LEGACY_DIR = fileURLToPath(new URL('./legacy', import.meta.url));
const hasLegacy = existsSync(LEGACY_DIR);

const REACT_URL = 'http://localhost:5173';
const LEGACY_URL = 'http://localhost:5174';

const desktop = devices['Desktop Chrome'];

// Argentine locale/time zone: dates and number formats match what the hostal staff sees.
const sharedUse = { ...desktop, locale: 'es-AR', timezoneId: 'America/Argentina/Cordoba' };

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Skipped automatically once `legacy/` is deleted.
    ...(hasLegacy ? [{ name: 'legacy', use: { ...sharedUse, baseURL: LEGACY_URL } }] : []),
    { name: 'react', use: { ...sharedUse, baseURL: REACT_URL } },
  ],
  webServer: [
    ...(hasLegacy
      ? [
          {
            command: `node e2e/support/static-server.mjs "${LEGACY_DIR}" 5174`,
            url: `${LEGACY_URL}/index.html`,
            reuseExistingServer: true,
          },
        ]
      : []),
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: REACT_URL,
      reuseExistingServer: true,
    },
  ],
});

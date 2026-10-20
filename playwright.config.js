import { defineConfig, devices } from '@playwright/test';

// Every backend is mocked (see e2e/support): nothing ever leaves localhost.
const APP_URL = 'http://localhost:5173';

// Argentine locale/time zone: dates and number formats match what the hostal staff sees.
const desktop = { ...devices['Desktop Chrome'], locale: 'es-AR', timezoneId: 'America/Argentina/Cordoba' };

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
  projects: [{ name: 'react', use: { ...desktop, baseURL: APP_URL } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: APP_URL,
    reuseExistingServer: true,
  },
});

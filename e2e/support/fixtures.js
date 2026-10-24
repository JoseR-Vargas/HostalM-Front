import { expect, test as base } from '@playwright/test';
import { MockApi } from './mock-api.js';

export { expect };

export const TOKEN_KEY = 'mayelewoo_admin_token';
export const FAKE_TOKEN = 'fake-e2e-token';

// All tests "live" in the middle of March 2026 (12:00 in Córdoba, UTC-3), so month labels,
// month filters and "today" are deterministic.
export const FIXED_NOW = '2026-03-15T15:00:00Z';
export const CURRENT_MONTH_LABEL = 'Marzo de 2026';

/** ISO timestamp on a given day of the fixed month (noon in Córdoba, any time zone safe). */
export function dayOfMonth(day, { month = 2, year = 2026 } = {}) {
  return new Date(Date.UTC(year, month, day, 15)).toISOString();
}

/**
 * Shared test fixture:
 * - `mock`: the mocked backend for this test; the network guard fails the test if anything
 *   tried to reach a non-mocked host (production backends included)
 * - `signIn()`: seeds a fake admin session before the first page load
 */
export const test = base.extend({
  mock: [
    async ({ context, baseURL }, use) => {
      const mock = new MockApi({ appOrigin: new URL(baseURL).origin });
      await mock.install(context);
      await context.clock.setFixedTime(FIXED_NOW);
      // Infinite animations (the `Spinner`, effects on buttons) would keep Playwright from seeing an element as
      // "stable". CSS animations are switched off (transitions are kept) so every click follows the normal
      // actionability rules.
      await context.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = '*, *::before, *::after { animation: none !important; }';
          document.head.appendChild(style);
        });
      });

      await use(mock);

      expect(mock.violations, 'requests to non-mocked hosts / endpoints').toEqual([]);
    },
    { auto: true },
  ],

  signIn: async ({ context }, use) => {
    await use(async () => {
      // Seed once per tab: after a logout the token must stay gone on the next page load.
      await context.addInitScript(
        ({ key, token }) => {
          if (!sessionStorage.getItem('__e2e_signed_in')) {
            sessionStorage.setItem(key, token);
            sessionStorage.setItem('__e2e_signed_in', '1');
          }
        },
        { key: TOKEN_KEY, token: FAKE_TOKEN },
      );
    });
  },
});

/** Pages that need a session: used by the guard and mobile specs. */
export const ADMIN_PAGES = [
  '/dashboard',
  '/dashboard-calculator',
  '/calcular-pago',
  '/comprobante-pago',
  '/comprobante-servicios',
];

export const PUBLIC_PAGES = ['/', '/login', '/vouchers', '/calculator-medidor'];


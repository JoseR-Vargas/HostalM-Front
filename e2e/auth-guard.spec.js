import { ADMIN_PAGES, expect, test, TOKEN_KEY } from './support/fixtures.js';

const PROTECTED_IN_BOTH = ADMIN_PAGES.filter((path) => path !== '/dashboard-calculator.html');

const storedToken = (page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

test.describe('route guard', () => {
  for (const path of PROTECTED_IN_BOTH) {
    test(`${path} without a session ends on the login page`, async ({ page, mock }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login(\.html)?$/);
      await expect(page.locator('.login-title')).toHaveText('Acceso Administrador');
      expect(mock.requests.filter((request) => request.path.startsWith('/api/'))).toEqual([]);
    });
  }

  test('/dashboard-calculator.html without a session ends on the login page', async ({ page, mock, app }) => {
    // INTENTIONAL DEVIATION (security fix): the legacy page had no guard (no requireAuth call),
    // it loaded the data without a token. The React route is protected like the other admin pages.
    test.skip(app === 'legacy', 'legacy dashboard-calculator.html was not guarded');

    await page.goto('/dashboard-calculator.html');

    await expect(page).toHaveURL(/\/login$/);
    expect(mock.requests.filter((request) => request.path.startsWith('/api/'))).toEqual([]);
  });

  for (const path of ADMIN_PAGES) {
    test(`logout on ${path} clears the token and returns to login`, async ({ page, signIn }) => {
      await signIn();
      await page.goto(path);
      expect(await storedToken(page)).not.toBeNull();

      await page.locator('.logout-btn').click();

      await expect(page).toHaveURL(/\/login(\.html)?$/);
      expect(await storedToken(page)).toBeNull();

      // The session is really gone: the admin page bounces back to login.
      if (path !== '/dashboard-calculator.html') {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login(\.html)?$/);
      }
    });
  }

  test('the admin menu navigates between admin pages while signed in', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/dashboard.html');

    await expect(page.locator('.nav-link')).toHaveText(['📄 Alquiler', '💧 Servicios', '⚡ Calcular Pago', '🧮 Medidores']);

    await page.getByRole('link', { name: '📄 Alquiler' }).click();
    await expect(page).toHaveURL(/\/comprobante-pago(\.html)?$/);
    await expect(page.locator('.section-title')).toHaveText('Comprobante de Pago');
  });
});

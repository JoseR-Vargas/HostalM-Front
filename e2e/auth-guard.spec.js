import { ADMIN_PAGES, expect, test, TOKEN_KEY } from './support/fixtures.js';

const storedToken = (page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

test.describe('route guard', () => {
  for (const path of ADMIN_PAGES) {
    test(`${path} without a session ends on the login page`, async ({ page, mock }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.locator('.login-title')).toHaveText('Acceso Administrador');
      expect(mock.requests.filter((request) => request.path.startsWith('/api/'))).toEqual([]);
    });
  }

  for (const path of ADMIN_PAGES) {
    test(`logout on ${path} clears the token and returns to login`, async ({ page, signIn }) => {
      await signIn();
      await page.goto(path);
      expect(await storedToken(page)).not.toBeNull();

      await page.locator('.logout-btn').click();

      await expect(page).toHaveURL(/\/login$/);
      expect(await storedToken(page)).toBeNull();

      // The session is really gone: the admin page bounces back to login.
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('the admin menu navigates between admin pages while signed in', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/dashboard');

    await expect(page.locator('.nav-link')).toHaveText(['📄 Alquiler', '💧 Servicios', '⚡ Calcular Pago', '🧮 Medidores']);

    await page.getByRole('link', { name: '📄 Alquiler' }).click();
    await expect(page).toHaveURL(/\/comprobante-pago$/);
    await expect(page.locator('.section-title')).toHaveText('Comprobante de Pago');
  });
});

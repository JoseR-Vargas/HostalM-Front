import { expect, test } from './support/fixtures.js';

// Old static-site `.html` URLs keep working through client-side redirects.
test.describe('old .html URL redirects', () => {
  const location = (page) => {
    const url = new URL(page.url());
    return `${url.pathname}${url.search}${url.hash}`;
  };

  test('/index.html goes to /', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.hero-title')).toBeVisible();
  });

  test('/index.html#contacto keeps the hash', async ({ page }) => {
    await page.goto('/index.html#contacto');

    await expect(page).toHaveURL(/\/#contacto$/);
    await expect(page.locator('#contacto')).toBeInViewport();
  });

  const PUBLIC = [
    ['/login.html', '/login', '.login-title'],
    ['/vouchers.html', '/vouchers', '#voucherForm'],
    ['/calculator-medidor.html', '/calculator-medidor', '#calculatorForm'],
  ];

  for (const [from, to, marker] of PUBLIC) {
    test(`${from} goes to ${to}`, async ({ page }) => {
      await page.goto(from);

      await expect.poll(() => location(page)).toBe(to);
      await expect(page.locator(marker)).toBeVisible();
    });
  }

  test('/vouchers.html?x=1 keeps the query string', async ({ page }) => {
    await page.goto('/vouchers.html?x=1');

    await expect.poll(() => location(page)).toBe('/vouchers?x=1');
    await expect(page.locator('#voucherForm')).toBeVisible();
  });

  test('the ?backend override survives the redirect', async ({ page }) => {
    await page.goto('/vouchers.html?backend=local');

    await expect.poll(() => location(page)).toBe('/vouchers?backend=local');
  });

  const ADMIN = [
    ['/dashboard.html', '/dashboard', '#voucherTable'],
    ['/dashboard-calculator.html', '/dashboard-calculator', '#calculatorTable'],
    ['/calcular-pago.html', '/calcular-pago', '#btnCalcularPrecio'],
    ['/comprobante-pago.html', '/comprobante-pago', '#btnGenerar'],
    ['/comprobante-servicios.html', '/comprobante-servicios', '#btnGenerar'],
  ];

  for (const [from, to, marker] of ADMIN) {
    test(`${from} goes to ${to} for an admin`, async ({ page, signIn }) => {
      await signIn();
      await page.goto(from);

      await expect.poll(() => location(page)).toBe(to);
      await expect(page.locator(marker)).toBeVisible();
    });

    test(`${from} ends on the login page without a session`, async ({ page }) => {
      await page.goto(from);

      await expect.poll(() => location(page)).toBe('/login');
    });
  }

  for (const orphan of ['/dashboard-luz.html', '/contadores-luz.html', '/dashboard-luz', '/contadores-luz']) {
    test(`the removed page ${orphan} goes to /`, async ({ page }) => {
      await page.goto(orphan);

      await expect.poll(() => location(page)).toBe('/');
      await expect(page.locator('.hero-title')).toBeVisible();
    });
  }

  for (const unknown of ['/does-not-exist', '/dashboard/extra', '/a/b/c.html']) {
    test(`the unknown path ${unknown} goes to /`, async ({ page }) => {
      await page.goto(unknown);

      await expect.poll(() => location(page)).toBe('/');
      await expect(page.locator('.hero-title')).toBeVisible();
    });
  }

  test('clean routes can be opened directly (deep link / refresh)', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/dashboard');
    await expect(page.locator('.section-title')).toHaveText('Dashboard Administrativo');

    await page.reload();
    await expect(page.locator('.section-title')).toHaveText('Dashboard Administrativo');
  });
});

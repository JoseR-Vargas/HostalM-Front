import { expect, test } from './support/fixtures.js';

test('the app root loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Hostal Mayelewoo/);
  await expect(page.locator('.hero-title')).toHaveText('Bienvenido a Hostal Mayelewoo');
});

import { expect, test } from '@playwright/test';

test('the app root loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page).toHaveTitle(/Hostal Mayelewoo/);
});

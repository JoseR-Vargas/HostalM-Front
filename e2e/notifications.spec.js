import { dayOfMonth, expect, test } from './support/fixtures.js';

const OLD_VOUCHER = {
  _id: 'v1',
  nombre: '[TEST] Beto',
  apellido: 'Ejemplo',
  hab: '2',
  monto: '75.000',
  timestamp: dayOfMonth(10),
  fotos: [],
};
// "Now" is 2026-03-15T15:00:00Z (see fixtures.js).
const NEW_VOUCHER = {
  _id: 'v2',
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  hab: '4',
  monto: '50.000',
  timestamp: '2026-03-15T14:50:00Z',
  fotos: [],
};
const NEW_READING = {
  _id: 'c2',
  nombre: '[TEST] Carla',
  apellido: 'Luz',
  habitacion: 'Apto 2',
  medicionAnterior: 100,
  medicionActual: 160.5,
  consumoCalculado: 60.5,
  createdAt: '2026-03-15T14:58:00Z',
};

const bell = (page) => page.locator('#notificationBell');
const badge = (page) => page.locator('.notification-badge');
const panel = (page) => page.locator('#notificationPanel');

async function openDashboard(page, mock) {
  mock.on('GET', '/api/vouchers', { json: { success: true, data: [OLD_VOUCHER] } });
  mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: [] } });
  await page.goto('/dashboard');
  await page.locator('.notification-bell[data-ready="true"]').waitFor();
}

/** A voucher and a meter reading arrive; the bell checks right away instead of waiting its 30 s interval. */
async function receiveUploads(page, mock) {
  mock.on('GET', '/api/vouchers', { json: { success: true, data: [OLD_VOUCHER, NEW_VOUCHER] } });
  mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: [NEW_READING] } });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
}

test.describe('admin notifications (bell)', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test('records that already existed do not notify', async ({ page, mock }) => {
    await openDashboard(page, mock);

    await expect(bell(page)).toHaveAttribute('aria-label', 'Notificaciones');
    await expect(badge(page)).toHaveCount(0);

    await bell(page).click();
    await expect(panel(page)).toContainText('No hay notificaciones');
  });

  test('a new voucher and a new meter reading show up with a short description', async ({ page, mock }) => {
    await openDashboard(page, mock);
    await receiveUploads(page, mock);

    await expect(badge(page)).toHaveText('2');
    await expect(bell(page)).toHaveAttribute('aria-label', 'Notificaciones, 2 sin leer');

    await bell(page).click();
    const items = panel(page).getByRole('link');
    await expect(items).toHaveCount(2);

    const reading = items.filter({ hasText: 'Nueva medición de luz' });
    await expect(reading).toContainText('[TEST] Carla Luz registró la medición de Apto 2: 60.5 kWh de consumo.');
    await expect(reading).toContainText('Hace 2 min');

    const voucher = items.filter({ hasText: 'Nuevo voucher' });
    await expect(voucher).toContainText('[TEST] Ana Prueba cargó un comprobante de la habitación 4 por $50.000.');
    await expect(voucher).toContainText('Hace 10 min');
  });

  test('opening a notification goes to its dashboard and marks it as read', async ({ page, mock }) => {
    await openDashboard(page, mock);
    await receiveUploads(page, mock);
    await expect(badge(page)).toHaveText('2');

    await bell(page).click();
    await panel(page).getByRole('link', { name: /Nueva medición de luz/ }).click();

    await expect(page).toHaveURL(/\/dashboard-calculator$/);
    await expect(panel(page)).toHaveCount(0);
    await expect(badge(page)).toHaveText('1');
  });

  test('marking everything as read clears the badge, and it stays cleared after a reload', async ({ page, mock }) => {
    await openDashboard(page, mock);
    await receiveUploads(page, mock);
    await expect(badge(page)).toHaveText('2');

    await bell(page).click();
    await panel(page).getByRole('button', { name: 'Marcar todo como leído' }).click();
    await expect(badge(page)).toHaveCount(0);

    await page.reload();
    await page.locator('.notification-bell[data-ready="true"]').waitFor();
    await expect(badge(page)).toHaveCount(0);
    await bell(page).click();
    await expect(panel(page).getByRole('link')).toHaveCount(2);
  });

  test('the panel closes with Escape and stays inside the screen on a phone', async ({ page, mock }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openDashboard(page, mock);
    await receiveUploads(page, mock);

    await bell(page).click();
    const box = await panel(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);

    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
  });
});

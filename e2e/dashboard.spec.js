import { CURRENT_MONTH_LABEL, dayOfMonth, expect, test } from './support/fixtures.js';

const API = 'http://localhost:3000';

const VOUCHERS = [
  {
    _id: 'v1',
    nombre: '[TEST] Ana',
    apellido: 'Prueba',
    dni: '10000001',
    email: 'ana@example.invalid',
    ref4: '1234',
    hab: 'Hab 4',
    monto: '50.000',
    timestamp: dayOfMonth(10),
    files: [{ name: 'comp1.png', url: '/uploads/vouchers/comp1.png' }],
  },
  {
    // Raw backend shape: only the stored file names (`fotos`) and `createdAt`.
    _id: 'v2',
    nombre: '[TEST] Beto',
    apellido: 'Ejemplo',
    dni: '10000002',
    email: 'beto@example.invalid',
    ref4: '4321',
    hab: 'Apto 2',
    monto: '75.000',
    createdAt: dayOfMonth(12),
    fotos: ['beto.jpg'],
  },
  {
    _id: 'v3',
    nombre: '[TEST] Carla',
    apellido: 'Febrero',
    dni: '10000003',
    email: 'carla@example.invalid',
    ref4: '9999',
    hab: 'Hab 1',
    monto: '20.000',
    timestamp: dayOfMonth(20, { month: 1 }),
    files: [{ name: 'recibo.pdf', url: '/uploads/vouchers/recibo.pdf' }],
  },
  // No usable date: it can't be placed in any month, so it is never listed.
  { _id: 'v4', nombre: '[TEST] Sin fecha', apellido: 'Nunca', hab: 'Hab 9', monto: '1.000' },
];

const rows = (page) => page.locator('#voucherTableBody tr');
const monthLabel = (page) => page.locator('#currentMonthLabel');

async function openDashboard(page, mock, vouchers = VOUCHERS) {
  mock.on('GET', '/api/vouchers', { json: { success: true, data: vouchers } });
  await page.goto('/dashboard');
  await expect(monthLabel(page)).toHaveText(CURRENT_MONTH_LABEL);
}

test.describe('admin dashboard (vouchers)', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test('lists the vouchers of the current month from the vouchers API', async ({ page, mock }) => {
    await openDashboard(page, mock);

    await expect(page.locator('.section-title')).toHaveText('Dashboard Administrativo');
    await expect(page.locator('#voucherTable thead th')).toHaveText([
      'Nombre',
      'DNI',
      'Email',
      'Ref 4',
      'Hab/Apto',
      'Monto',
      'Fecha',
      'Archivos',
    ]);
    await expect(rows(page)).toHaveCount(2);

    await expect(rows(page).first().locator('td')).toHaveText(
      ['[TEST] Ana Prueba', '10000001', 'ana@example.invalid', '1234', 'Hab 4', '50.000', '10/3/2026', ''],
      { useInnerText: true },
    );
    await expect(rows(page).last().locator('td').nth(0)).toHaveText('[TEST] Beto Ejemplo');
    await expect(rows(page).last().locator('td').nth(6)).toHaveText('12/3/2026');

    const [request] = mock.calls('GET', '/api/vouchers');
    expect(request.origin).toBe(API);
    // The vouchers listing is public: it never sends an auth header.
    expect(request.headers.authorization).toBeUndefined();
  });

  test('files render as thumbnails served from the vouchers backend', async ({ page, mock }) => {
    await openDashboard(page, mock);

    const thumbs = page.locator('#voucherTableBody img[title="Clic para ver completa"]');
    await expect(thumbs).toHaveCount(2);
    await expect(thumbs.nth(0)).toHaveAttribute('src', `${API}/uploads/vouchers/comp1.png`);
    // Raw `fotos` names are turned into upload URLs.
    await expect(thumbs.nth(1)).toHaveAttribute('src', `${API}/uploads/vouchers/beto.jpg`);
    await expect(thumbs.nth(0)).toHaveAttribute('alt', 'comp1.png');
  });

  test('non-image files render as links', async ({ page, mock }) => {
    await openDashboard(page, mock);
    await page.locator('#prevMonth').click();

    await expect(monthLabel(page)).toHaveText('Febrero de 2026');
    await expect(rows(page)).toHaveCount(1);
    const link = rows(page).first().locator('a');
    await expect(link).toHaveText('recibo.pdf');
    await expect(link).toHaveAttribute('href', `${API}/uploads/vouchers/recibo.pdf`);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('the month pager moves between months and wraps over the year', async ({ page, mock }) => {
    await openDashboard(page, mock);

    await page.locator('#prevMonth').click();
    await expect(monthLabel(page)).toHaveText('Febrero de 2026');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('td').first()).toHaveText('[TEST] Carla Febrero');

    await page.locator('#prevMonth').click();
    await expect(monthLabel(page)).toHaveText('Enero de 2026');
    await expect(rows(page)).toHaveCount(0);

    await page.locator('#prevMonth').click();
    await expect(monthLabel(page)).toHaveText('Diciembre de 2025');

    for (let step = 0; step < 3; step += 1) await page.locator('#nextMonth').click();
    await expect(monthLabel(page)).toHaveText(CURRENT_MONTH_LABEL);
    await expect(rows(page)).toHaveCount(2);

    await page.locator('#nextMonth').click();
    await expect(monthLabel(page)).toHaveText('Abril de 2026');
    await expect(rows(page)).toHaveCount(0);
  });

  test('a thumbnail opens the image modal; the close button and the backdrop close it', async ({ page, mock }) => {
    await openDashboard(page, mock);
    const modal = page.locator('#imageModal');
    const thumb = page.locator('#voucherTableBody img[title="Clic para ver completa"]').first();

    await expect(modal).not.toHaveClass(/show/);
    await thumb.click();
    await expect(modal).toHaveClass(/show/);
    await expect(page.locator('#modalImage')).toHaveAttribute('src', `${API}/uploads/vouchers/comp1.png`);
    await expect(page.locator('#modalImageName')).toHaveText('comp1.png');

    await page.locator('.close-modal-btn').click();
    await expect(modal).not.toHaveClass(/show/);

    await thumb.click();
    await expect(modal).toHaveClass(/show/);
    // A click on the dark backdrop (outside the content box) closes it too.
    await modal.click({ position: { x: 5, y: 5 } });
    await expect(modal).not.toHaveClass(/show/);

    // A click inside the content box does not.
    await thumb.click();
    await page.locator('#modalImageName').click();
    await expect(modal).toHaveClass(/show/);
  });

  test('a thumbnail that fails to load falls back to a text link', async ({ page, mock }) => {
    mock.on('GET', '/uploads/vouchers/:name', { status: 404, body: 'missing', contentType: 'text/plain' });
    await openDashboard(page, mock, [VOUCHERS[0]]);

    await expect(rows(page).first().locator('a')).toHaveText('comp1.png');
    await expect(rows(page).first().locator('img')).toBeHidden();
  });

  const FAILURES = [
    { title: 'a 500 answer', response: { status: 500, json: { message: 'boom' } } },
    { title: 'an unreachable server', response: { abort: 'failed' } },
  ];

  for (const { title, response } of FAILURES) {
    test(`${title} shows an error state, even with vouchers saved in localStorage`, async ({ page, mock, context }) => {
      // Stale data from older versions must never be used as a fallback.
      await context.addInitScript(
        (pending) => localStorage.setItem('pendingVouchers', JSON.stringify(pending)),
        [{ nombre: '[TEST] Offline', apellido: 'Guardado', hab: 'Hab 7', timestamp: dayOfMonth(14) }],
      );
      mock.on('GET', '/api/vouchers', response);
      await page.goto('/dashboard');

      await expect(page.locator('#vouchersLoadError')).toHaveText('No se pudieron cargar los comprobantes.');
      await expect(page.locator('#voucherTable')).toHaveCount(0);
      await expect(page.getByText('[TEST] Offline')).toHaveCount(0);
      await expect(monthLabel(page)).toHaveText(CURRENT_MONTH_LABEL);
    });
  }

  test('entering an admin route prewarms the backend once', async ({ page, mock }) => {
    await openDashboard(page, mock, []);

    await expect.poll(() => mock.calls('GET', '/health').length).toBe(1);
  });

  test('an empty successful answer still renders the empty table, not the error state', async ({ page, mock }) => {
    await openDashboard(page, mock, []);

    await expect(page.locator('#voucherTable')).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('#vouchersLoadError')).toHaveCount(0);
  });
});

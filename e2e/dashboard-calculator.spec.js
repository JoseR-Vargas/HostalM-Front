import { CURRENT_MONTH_LABEL, dayOfMonth, expect, FAKE_TOKEN, test } from './support/fixtures.js';

const API = 'http://localhost:3000';

const CALCULOS = [
  {
    _id: 'c1',
    nombre: '[TEST] Ana',
    apellido: 'Prueba',
    dni: '10000001',
    habitacion: 'Hab 4',
    medicionAnterior: 1000,
    medicionActual: 1060.5,
    consumoCalculado: 60.5,
    montoTotal: 26575.23,
    fechaRegistro: dayOfMonth(10),
    fotoAnteriorData: { filename: 'antes.png' },
    fotoActualData: { filename: 'despues.png' },
  },
  {
    // Only the current photo was stored.
    _id: 'c2',
    nombre: '[TEST] Beto',
    apellido: 'Ejemplo',
    dni: '10000002',
    habitacion: 'Apto 2',
    medicionAnterior: 3565.9,
    medicionActual: 3572.1,
    consumoCalculado: 6.2,
    montoTotal: 2723.41,
    fechaRegistro: dayOfMonth(12),
    fotoActualData: { filename: 'beto.png' },
  },
  {
    _id: 'c3',
    nombre: '[TEST] Ana',
    apellido: 'Prueba',
    dni: '10000001',
    habitacion: 'Hab 4',
    medicionAnterior: 900,
    medicionActual: 1000,
    consumoCalculado: 100,
    montoTotal: 43926,
    fechaRegistro: dayOfMonth(20, { month: 1 }),
  },
];

const rows = (page) => page.locator('#calculatorTableBody tr');
const monthLabel = (page) => page.locator('#currentMonthLabel');
const metricValues = (page) => page.locator('#metricsCalculator .metric-value');

async function openPage(page, mock, calculos = CALCULOS) {
  mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: calculos } });
  await page.goto('/dashboard-calculator.html');
  await expect(monthLabel(page)).toHaveText(CURRENT_MONTH_LABEL);
}

test.describe('admin dashboard (meter calculations)', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test('lists the month calculations and authenticates the request with the Bearer token', async ({ page, mock }) => {
    await openPage(page, mock);

    await expect(page.locator('.section-title')).toHaveText('Calculadora de Medidor');
    await expect(page.locator('#calculatorTable thead th')).toHaveText([
      'Nombre',
      'Apellido',
      'DNI',
      'Habitación',
      'Medición Ant.',
      'Medición Act.',
      'Consumo (kWh)',
      'Fecha',
      'Fotos',
    ]);
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).first().locator('td').nth(0)).toHaveText('[TEST] Ana');
    await expect(rows(page).first().locator('td')).toHaveText(
      ['[TEST] Ana', 'Prueba', '10000001', 'Hab 4', '1000.0', '1060.5', '60.5', '10/3/2026', ''],
      { useInnerText: true },
    );
    await expect(rows(page).last().locator('td')).toHaveText(
      ['[TEST] Beto', 'Ejemplo', '10000002', 'Apto 2', '3565.9', '3572.1', '6.2', '12/3/2026', 'Sin foto ant.'],
      { useInnerText: true },
    );

    const [request] = mock.calls('GET', '/api/calculos-medidor');
    expect(request.origin).toBe(API);
    expect(request.headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`);
  });

  test('shows the metrics of the selected month', async ({ page, mock }) => {
    await openPage(page, mock);

    await expect(page.locator('#metricsCalculator .metric-title')).toHaveText([
      'Total Registros',
      'Consumo Total',
      'Promedio Consumo',
    ]);
    await expect(metricValues(page)).toHaveText(['2', '66.7 kWh', `${((60.5 + 6.2) / 2).toFixed(1)} kWh`]);

    await page.locator('#prevMonth').click();
    await expect(monthLabel(page)).toHaveText('Febrero de 2026');
    await expect(metricValues(page)).toHaveText(['1', '100.0 kWh', '100.0 kWh']);
  });

  test('photo thumbnails point at the per-calculation photo endpoints', async ({ page, mock }) => {
    await openPage(page, mock);

    const first = rows(page).first().locator('img.foto-medidor-preview');
    await expect(first).toHaveCount(2);
    await expect(first.nth(0)).toHaveAttribute('src', `${API}/api/calculos-medidor/c1/foto-anterior`);
    await expect(first.nth(0)).toHaveAttribute('alt', 'Medición Anterior');
    await expect(first.nth(1)).toHaveAttribute('src', `${API}/api/calculos-medidor/c1/foto-actual`);

    const second = rows(page).last();
    await expect(second.locator('.sin-foto')).toHaveText('Sin foto ant.');
    await expect(second.locator('img.foto-medidor-preview')).toHaveAttribute(
      'src',
      `${API}/api/calculos-medidor/c2/foto-actual`,
    );
    expect(mock.calls('GET', '/api/calculos-medidor/:id/foto-anterior').length).toBeGreaterThan(0);
  });

  test('the photo modal shows the full photo and closes with the X, Escape or the backdrop', async ({ page, mock }) => {
    await openPage(page, mock);
    const modal = page.locator('#imageModal');
    const thumb = rows(page).first().locator('img.foto-medidor-preview').first();

    await expect(modal).not.toHaveClass(/show/);
    await thumb.click();
    await expect(modal).toHaveClass(/show/);
    await expect(page.locator('#imageModalTitle')).toHaveText('Medición Anterior - Hab 4');
    await expect(page.locator('#modalImage')).toHaveAttribute('src', `${API}/api/calculos-medidor/c1/foto-anterior`);

    await page.locator('#imageModal .close-modal').click();
    await expect(modal).not.toHaveClass(/show/);

    await rows(page).first().locator('img.foto-medidor-preview').nth(1).click();
    await expect(page.locator('#imageModalTitle')).toHaveText('Medición Actual - Hab 4');
    await expect(page.locator('#modalImage')).toHaveAttribute('src', `${API}/api/calculos-medidor/c1/foto-actual`);
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/show/);

    await thumb.click();
    await expect(modal).toHaveClass(/show/);
    await modal.click({ position: { x: 5, y: 5 } });
    await expect(modal).not.toHaveClass(/show/);
  });

  test('a photo that fails to load shows the error state', async ({ page, mock }) => {
    mock.on('GET', '/api/calculos-medidor/:id/foto-actual', { status: 404, body: 'missing', contentType: 'text/plain' });
    await openPage(page, mock, [CALCULOS[1]]);

    const photo = rows(page).first().locator('img.foto-medidor-preview');
    await expect(photo).toHaveClass(/imagen-error/);
    await expect(photo).toHaveAttribute('alt', 'Error al cargar');
  });

  test('the month pager changes the listing and shows the empty message', async ({ page, mock }) => {
    await openPage(page, mock);

    await page.locator('#prevMonth').click();
    await expect(monthLabel(page)).toHaveText('Febrero de 2026');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('td').nth(6)).toHaveText('100.0');
    await expect(rows(page).first().locator('.sin-foto')).toHaveText(['Sin foto ant.', 'Sin foto act.']);

    await page.locator('#prevMonth').click();
    await expect(monthLabel(page)).toHaveText('Enero de 2026');
    await expect(page.locator('#noDataMessage')).toBeVisible();
    await expect(page.locator('#noDataMessage')).toHaveText('No hay registros de cálculos disponibles');
    await expect(page.locator('.table-container')).toBeHidden();
    await expect(metricValues(page)).toHaveText(['0', '0.0 kWh', '0 kWh']);

    await page.locator('#nextMonth').click();
    await expect(monthLabel(page)).toHaveText('Febrero de 2026');
    await expect(page.locator('#noDataMessage')).toBeHidden();
    await expect(page.locator('.table-container')).toBeVisible();
  });

  test('a record without a date is still listed in every month', async ({ page, mock, app }) => {
    const undated = { ...CALCULOS[0], _id: 'c9', nombre: '[TEST] Sin fecha', fechaRegistro: undefined };
    await openPage(page, mock, [undated]);

    await expect(rows(page)).toHaveCount(1);
    await page.locator('#prevMonth').click();
    await expect(rows(page)).toHaveCount(1);

    // INTENTIONAL DEVIATION: an invalid date shows "—" in React; the legacy table printed
    // the browser's literal "Invalid Date".
    await expect(rows(page).first().locator('td').nth(7)).toHaveText(app === 'react' ? '—' : 'Invalid Date');
  });

  test('a failed load alerts and hides the loading overlay', async ({ page, mock }) => {
    mock.on('GET', '/api/calculos-medidor', { status: 500, json: { message: 'boom' } });
    const dialogs = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      dialog.accept();
    });
    await page.goto('/dashboard-calculator.html');

    await expect.poll(() => dialogs).toEqual(['Error al cargar los datos. Por favor, intente nuevamente.']);
    await expect(page.locator('#loadingOverlay')).toBeHidden();
    await expect(rows(page)).toHaveCount(0);
  });

  test('the loading overlay covers the page until the data arrives', async ({ page, mock }) => {
    mock.on('GET', '/api/calculos-medidor', { delayMs: 800, json: { success: true, data: CALCULOS } });
    await page.goto('/dashboard-calculator.html');

    await expect(page.locator('#loadingOverlay')).toBeVisible();
    await expect(page.locator('#loadingOverlay')).toBeHidden();
    await expect(rows(page)).toHaveCount(2);
  });
});

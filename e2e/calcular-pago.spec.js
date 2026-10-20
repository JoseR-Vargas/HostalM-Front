import { CURRENT_MONTH_LABEL, dayOfMonth, expect, FAKE_TOKEN, test } from './support/fixtures.js';

const PAGE = '/calcular-pago';

const resident = (overrides) => ({
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  dni: '10000001',
  habitacion: 'Hab 4',
  medicionAnterior: 1000,
  medicionActual: 1040,
  consumoCalculado: 40,
  montoTotal: 0,
  fechaRegistro: dayOfMonth(5),
  ...overrides,
});

const CALCULOS = [
  resident({ _id: 'r1', consumoCalculado: 40 }),
  // Same room, later in the month: the most recent record wins.
  resident({ _id: 'r1b', consumoCalculado: 60.5, fechaRegistro: dayOfMonth(18) }),
  resident({ _id: 'r2', nombre: '[TEST] Beto', apellido: 'Ejemplo', habitacion: 'Apto 2', consumoCalculado: 6.2, fechaRegistro: dayOfMonth(12) }),
  resident({ _id: 'r3', nombre: '[TEST] Carla', apellido: 'Diez', habitacion: 'Hab 10', consumoCalculado: 20, fechaRegistro: dayOfMonth(3) }),
  resident({ _id: 'r4', nombre: '[TEST] Dora', apellido: 'Febrero', habitacion: 'Hab 1', consumoCalculado: 100, fechaRegistro: dayOfMonth(20, { month: 1 }) }),
];

// Bill used in most tests: $200.000,50 for 450 kWh -> 444,45 per kWh.
const BILL = { monto: '200.000,50', kwh: '450' };

const group = (page, id) => page.locator(`#${id}`).locator('xpath=ancestor::div[contains(@class,"form-group")][1]');
const rows = (page) => page.locator('#residentesTableBody tr');

async function calculatePrice(page, { monto = BILL.monto, kwh = BILL.kwh } = {}) {
  await page.locator('#montoFactura').fill(monto);
  await page.locator('#totalKwhFactura').fill(kwh);
  await page.locator('#btnCalcularPrecio').click();
}

async function openWithData(page, mock, calculos = CALCULOS) {
  mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: calculos } });
  await page.goto(PAGE);
}

const selectResident = (page, habitacion) =>
  page.locator(`[id="fila-${habitacion}"]`).getByRole('button', { name: 'Seleccionar' }).click();

test.describe('calcular pago (electricity bill split)', () => {
  test.beforeEach(async ({ signIn }) => {
    await signIn();
  });

  test('step 2 stays hidden and the price empty until the price is calculated', async ({ page }) => {
    await page.goto(PAGE);

    await expect(page.locator('.section-title')).toHaveText('Calculadora de Pago de Electricidad');
    await expect(page.locator('#precioKwh')).toHaveValue('');
    await expect(page.locator('#precioKwh')).toHaveAttribute('readonly', '');
    await expect(page.locator('#step2Section')).toBeHidden();
  });

  test('the bill inputs are formatted while typing', async ({ page }) => {
    await page.goto(PAGE);

    await page.locator('#montoFactura').fill('abc200000,5x');
    await expect(page.locator('#montoFactura')).toHaveValue('200.000,5');

    await page.locator('#montoFactura').fill('1234567');
    await expect(page.locator('#montoFactura')).toHaveValue('1.234.567');

    await page.locator('#totalKwhFactura').fill('4a5,0,1');
    await expect(page.locator('#totalKwhFactura')).toHaveValue('45,01');
  });

  test('step 1 validates the bill before calculating', async ({ page, mock }) => {
    await page.goto(PAGE);
    await page.locator('#btnCalcularPrecio').click();

    await expect(group(page, 'montoFactura')).toHaveClass(/error/);
    await expect(group(page, 'montoFactura').locator('.error-message')).toHaveText('Ingresá un monto válido mayor a cero');
    await expect(group(page, 'totalKwhFactura')).toHaveClass(/error/);
    await expect(group(page, 'totalKwhFactura').locator('.error-message')).toHaveText(
      'Ingresá los kWh totales de la factura (mayor a cero)',
    );
    await expect(page.locator('#precioKwh')).toHaveValue('');
    await expect(page.locator('#step2Section')).toBeHidden();

    // Zero is not a valid bill either.
    await calculatePrice(page, { monto: '0', kwh: '0' });
    await expect(group(page, 'montoFactura')).toHaveClass(/error/);
    await expect(group(page, 'totalKwhFactura')).toHaveClass(/error/);

    expect(mock.calls('GET', '/api/calculos-medidor')).toHaveLength(0);
  });

  test('errors are cleared as soon as the bill is valid', async ({ page, mock }) => {
    await openWithData(page, mock);
    await page.locator('#btnCalcularPrecio').click();
    await expect(group(page, 'montoFactura')).toHaveClass(/error/);

    await calculatePrice(page);
    await expect(group(page, 'montoFactura')).not.toHaveClass(/error/);
    await expect(group(page, 'totalKwhFactura')).not.toHaveClass(/error/);
  });

  test('calculates price = bill / total kWh in Argentine format and loads the residents', async ({ page, mock }) => {
    await openWithData(page, mock);
    await calculatePrice(page);

    await expect(page.locator('#precioKwh')).toHaveValue('444,45');
    await expect(page.locator('#step2Section')).toBeVisible();
    await expect(page.locator('#residentesMonthLabel')).toHaveText(CURRENT_MONTH_LABEL);

    const [request] = mock.calls('GET', '/api/calculos-medidor');
    expect(request.origin).toBe('http://localhost:3000');
    expect(request.headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`);

    // Month filter + latest record per room + alphabetical sort ("Hab 10" sorts before "Hab 4").
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).locator('td:nth-child(3)')).toHaveText(['Apto 2', 'Hab 10', 'Hab 4']);
    await expect(rows(page).last().locator('td')).toHaveText([
      '[TEST] Ana',
      'Prueba',
      'Hab 4',
      '60.5 kWh',
      'Seleccionar',
    ]);
    await expect(page.locator('#residenteSeleccionado')).toBeHidden();
  });

  test('accepts a comma decimal in the kWh field', async ({ page, mock }) => {
    await openWithData(page, mock);
    await calculatePrice(page, { monto: '100.000', kwh: '400,0' });

    await expect(page.locator('#precioKwh')).toHaveValue('250,00');
  });

  test('selecting a resident shows consumption x price as the total to pay', async ({ page, mock }) => {
    await openWithData(page, mock);
    await calculatePrice(page);

    await selectResident(page, 'Hab 4');

    await expect(page.locator('#residenteSeleccionado')).toBeVisible();
    await expect(page.locator('#residenteNombreDisplay')).toHaveText('[TEST] Ana Prueba');
    await expect(page.locator('#residenteHabitacionDisplay')).toHaveText('Habitación: Hab 4');
    await expect(page.locator('#residenteConsumoDisplay')).toHaveText('60.5 kWh');
    await expect(page.locator('#residentePrecioKwhDisplay')).toHaveText('$444,45');
    // 60.5 kWh x (200000.5 / 450) = 26888.956...
    await expect(page.locator('#residenteTotalDisplay')).toHaveText('$26.888,96');
    await expect(page.locator('[id="fila-Hab 4"]')).toHaveCSS('background-color', 'rgba(43, 108, 176, 0.1)');

    await selectResident(page, 'Apto 2');
    await expect(page.locator('#residenteNombreDisplay')).toHaveText('[TEST] Beto Ejemplo');
    await expect(page.locator('#residenteTotalDisplay')).toHaveText('$2.755,56');
    await expect(page.locator('[id="fila-Apto 2"]')).toHaveCSS('background-color', 'rgba(43, 108, 176, 0.1)');
    await expect(page.locator('[id="fila-Hab 4"]')).not.toHaveCSS('background-color', 'rgba(43, 108, 176, 0.1)');
  });

  test('calculating again with a new bill refreshes the residents and clears the selection', async ({ page, mock }) => {
    await openWithData(page, mock);
    await calculatePrice(page);
    await selectResident(page, 'Hab 4');
    await expect(page.locator('#residenteSeleccionado')).toBeVisible();

    await calculatePrice(page, { monto: '100.000', kwh: '400' });
    await expect(page.locator('#precioKwh')).toHaveValue('250,00');
    await expect(page.locator('#residenteSeleccionado')).toBeHidden();

    await selectResident(page, 'Hab 4');
    await expect(page.locator('#residentePrecioKwhDisplay')).toHaveText('$250,00');
    await expect(page.locator('#residenteTotalDisplay')).toHaveText('$15.125,00');
    expect(mock.calls('GET', '/api/calculos-medidor')).toHaveLength(2);
  });

  test('the month pager re-filters without refetching and clears the selection', async ({ page, mock }) => {
    await openWithData(page, mock);
    await calculatePrice(page);
    await selectResident(page, 'Hab 4');

    await page.locator('#btnMesAnterior').click();
    await expect(page.locator('#residentesMonthLabel')).toHaveText('Febrero de 2026');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('td').nth(2)).toHaveText('Hab 1');
    await expect(rows(page).first().locator('td').nth(3)).toHaveText('100.0 kWh');
    await expect(page.locator('#residenteSeleccionado')).toBeHidden();

    await page.locator('#btnMesAnterior').click();
    await expect(page.locator('#residentesMonthLabel')).toHaveText('Enero de 2026');
    await expect(page.locator('#residentesEmpty')).toBeVisible();
    await expect(page.locator('#residentesEmpty')).toHaveText('No hay registros de consumo para este mes.');
    await expect(page.locator('#residentesTableContainer')).toBeHidden();

    await page.locator('#btnMesSiguiente').click();
    await page.locator('#btnMesSiguiente').click();
    await expect(page.locator('#residentesMonthLabel')).toHaveText(CURRENT_MONTH_LABEL);
    await expect(rows(page)).toHaveCount(3);
    expect(mock.calls('GET', '/api/calculos-medidor')).toHaveLength(1);
  });

  test('shows a loading message while the residents are fetched', async ({ page, mock }) => {
    mock.on('GET', '/api/calculos-medidor', { delayMs: 700, json: { success: true, data: CALCULOS } });
    await page.goto(PAGE);
    await calculatePrice(page);

    await expect(page.locator('#residentesLoading')).toBeVisible();
    await expect(page.locator('#residentesLoading')).toHaveText('Cargando residentes...');
    await expect(page.locator('#residentesLoading')).toBeHidden();
    await expect(rows(page)).toHaveCount(3);
  });

  test('a failed fetch shows the error message and keeps the price', async ({ page, mock }) => {
    mock.on('GET', '/api/calculos-medidor', { status: 500, json: { message: 'boom' } });
    await page.goto(PAGE);
    await calculatePrice(page);

    await expect(page.locator('#residentesError')).toBeVisible();
    await expect(page.locator('#residentesErrorMsg')).toHaveText(
      'No se pudo cargar la lista de residentes. Verificá tu conexión e intentá de nuevo.',
    );
    await expect(page.locator('#residentesTableContainer')).toBeHidden();
    await expect(page.locator('#precioKwh')).toHaveValue('444,45');
  });
});

import { fakePng, fakeTextFile } from './support/files.js';
import { expect, test } from './support/fixtures.js';
import { fileParts, textFields } from './support/multipart.js';

const VOUCHER = {
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  dni: '00000001',
  email: 'ana@example.invalid',
  ref4: '1234',
  hab: 'Hab 4',
  monto: '50.000',
};

async function fillVoucher(page, overrides = {}, files = [fakePng('comprobante-1.png')]) {
  const data = { ...VOUCHER, ...overrides };
  for (const [field, value] of Object.entries(data)) {
    await page.locator(`#${field}`).fill(value);
  }
  if (files.length > 0) await page.locator('#fotos').setInputFiles(files);
  return data;
}

const banner = (page) => page.locator('.voucher-banner');
const pendingVouchers = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pendingVouchers') || '[]'));

test.describe('vouchers (public upload)', () => {
  test('renders the upload form', async ({ page }) => {
    await page.goto('/vouchers');

    await expect(page.locator('.section-title')).toHaveText('Carga de Comprobante');
    await expect(page.locator('#voucherForm input:visible')).toHaveCount(8);
    await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
    await expect(page.locator('#fotos')).toHaveAttribute('accept', 'image/*');
  });

  test('a valid submit sends the multipart voucher to the vouchers API', async ({ page, mock }) => {
    await page.goto('/vouchers');
    await fillVoucher(page, {}, [fakePng('comprobante-1.png'), fakePng('comprobante-2.png')]);
    await page.locator('#submitBtn').click();

    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');

    const [request] = mock.calls('POST', '/api/vouchers');
    expect(request.origin).toBe('http://localhost:3000');
    expect(request.headers.authorization).toBeUndefined();
    expect(request.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);

    expect(request.multipart.map((part) => part.name)).toEqual([
      'nombre',
      'apellido',
      'dni',
      'email',
      'ref4',
      'hab',
      'monto',
      'timestamp',
      'files',
      'files',
    ]);
    const fields = textFields(request.multipart);
    expect(fields).toMatchObject(VOUCHER);
    expect(fields.timestamp).toBe('2026-03-15T15:00:00.000Z');

    const files = fileParts(request.multipart);
    expect(files.map((file) => file.filename)).toEqual(['comprobante-1.png', 'comprobante-2.png']);
    expect(files.every((file) => file.contentType === 'image/png' && file.size > 0)).toBe(true);
  });

  test('a successful submit clears the form', async ({ page }) => {
    await page.goto('/vouchers');
    await fillVoucher(page);
    await page.locator('#submitBtn').click();

    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');
    for (const field of Object.keys(VOUCHER)) {
      await expect(page.locator(`#${field}`)).toHaveValue('');
    }
    await expect(page.locator('#fotos')).toHaveValue('');
    await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
    await expect(page.locator('#submitBtn')).toBeEnabled();
    expect(await pendingVouchers(page)).toEqual([]);
  });

  test('the button shows progress while the upload is in flight', async ({ page, mock }) => {
    mock.on('POST', '/api/vouchers', { delayMs: 600, json: { success: true } });
    await page.goto('/vouchers');
    await fillVoucher(page);
    await page.locator('#submitBtn').click();

    await expect(page.locator('#submitBtn')).toBeDisabled();
    await expect(page.locator('#submitBtn')).toHaveText('Procesando...');
    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');
    await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
  });

  test('numeric inputs drop invalid characters while typing', async ({ page }) => {
    await page.goto('/vouchers');

    // Typed key by key: `fill` would be cut by maxlength=4 before the filter runs.
    await page.locator('#ref4').pressSequentially('a1b2c3d4e5');
    await expect(page.locator('#ref4')).toHaveValue('1234');

    await page.locator('#monto').fill('$1x0.0y00,50 ');
    await expect(page.locator('#monto')).toHaveValue('10.000,50');
  });

  const INVALID_CASES = [
    {
      title: 'all fields empty reports the first missing field',
      overrides: { nombre: '', apellido: '', dni: '', email: '', ref4: '', hab: '', monto: '' },
      files: [],
      message: 'El nombre es requerido',
    },
    { title: 'missing last name', overrides: { apellido: '' }, message: 'El apellido es requerido' },
    { title: 'missing DNI', overrides: { dni: '' }, message: 'El DNI es requerido' },
    { title: 'missing email', overrides: { email: '' }, message: 'El correo electrónico es requerido' },
    { title: 'malformed email', overrides: { email: 'a@b' }, message: 'El correo electrónico no es válido' },
    { title: 'ref4 with fewer than 4 digits', overrides: { ref4: '12' }, message: 'Los últimos 4 dígitos deben ser numéricos' },
    { title: 'missing room', overrides: { hab: '' }, message: 'El número de habitación/apartamento es requerido' },
    { title: 'missing amount', overrides: { monto: '' }, message: 'El monto depositado es requerido' },
    {
      title: 'amount below 1.000',
      overrides: { monto: '500' },
      message: 'Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)',
    },
    {
      title: 'amount without the thousands separator',
      overrides: { monto: '10000' },
      message: 'El monto debe estar en formato correcto con separador de miles. Ejemplo: 1.000, 10.000, 20.000',
    },
    {
      title: 'amount with a malformed thousands group',
      overrides: { monto: '1.00' },
      message: 'Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)',
    },
    { title: 'no image attached', overrides: {}, files: [], message: 'Debes adjuntar al menos una imagen del comprobante' },
    { title: 'a file that is not an image', overrides: {}, files: [fakeTextFile()], message: 'Solo se permiten imágenes' },
    {
      title: 'an image mixed with a non-image',
      overrides: {},
      files: [fakePng(), fakeTextFile()],
      message: 'Solo se permiten imágenes',
    },
  ];

  for (const { title, overrides, files, message } of INVALID_CASES) {
    test(`invalid: ${title}`, async ({ page, mock }) => {
      await page.goto('/vouchers');
      await fillVoucher(page, overrides, files);
      await page.locator('#submitBtn').click();

      await expect(banner(page)).toHaveCount(1);
      await expect(banner(page)).toHaveText(message);
      await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
      await expect(page.locator('#submitBtn')).toBeEnabled();
      expect(mock.calls('POST', '/api/vouchers')).toHaveLength(0);
      expect(await pendingVouchers(page)).toEqual([]);
    });
  }

  test('a new banner replaces the previous one', async ({ page }) => {
    await page.goto('/vouchers');
    await fillVoucher(page, { nombre: '' });
    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText('El nombre es requerido');

    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveCount(1);

    await page.locator('#nombre').fill('Ana');
    await page.locator('#apellido').fill('');
    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveCount(1);
    await expect(banner(page)).toHaveText('El apellido es requerido');
  });

  const SERVER_FAILURES = [
    { title: 'a 500 answer', response: { status: 500, json: { message: 'boom' } } },
    { title: 'an unreachable server', response: { abort: 'failed' } },
  ];

  for (const { title, response } of SERVER_FAILURES) {
    test(`${title} still shows the success banner and keeps the voucher locally`, async ({ page, mock }) => {
      mock.on('POST', '/api/vouchers', response);
      await page.goto('/vouchers');
      const data = await fillVoucher(page, {}, [fakePng('comprobante-1.png')]);
      await page.locator('#submitBtn').click();

      await expect(banner(page)).toHaveText('Guardado localmente. Se enviará cuando el backend esté disponible.');
      await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
      await expect(page.locator('#submitBtn')).toBeEnabled();
      // The form is NOT reset on failure: the user keeps what was typed.
      await expect(page.locator('#nombre')).toHaveValue(data.nombre);

      const [saved] = await pendingVouchers(page);
      expect(await pendingVouchers(page)).toHaveLength(1);
      expect(saved).toMatchObject(data);
      expect(saved.files).toEqual([{ name: 'comprobante-1.png', size: fakePng().buffer.length, type: 'image/png' }]);
      expect(saved.timestamp).toBe('2026-03-15T15:00:00.000Z');
    });
  }

  test('failed vouchers pile up in the local queue', async ({ page, mock }) => {
    mock.on('POST', '/api/vouchers', { status: 503, json: {} });
    await page.goto('/vouchers');
    await fillVoucher(page);

    await page.locator('#submitBtn').click();
    await expect(banner(page)).toContainText('Guardado localmente');
    await page.locator('#submitBtn').click();
    await expect.poll(async () => (await pendingVouchers(page)).length).toBe(2);
  });
});

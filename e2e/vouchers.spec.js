import { PNG_BUFFER, fakePng, fakeTextFile } from './support/files.js';
import { expect, test } from './support/fixtures.js';
import { fileParts, textFields } from './support/multipart.js';
import {
  photoPicker,
  photoPickerReady,
  photoPreviews,
  photoRemoveButtons,
  photoTrigger,
  selectPhotos,
} from './support/voucher-photos.js';

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
  if (files.length > 0) await selectPhotos(page, files);
  return data;
}

const banner = (page) => page.locator('.voucher-banner');
const pendingVouchers = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pendingVouchers') || '[]'));

test.describe('vouchers (public upload)', () => {
  test('renders the upload form', async ({ page }) => {
    await page.goto('/vouchers');

    await expect(page.locator('.section-title')).toHaveText('Carga de Comprobante');
    // The seven text fields; the photo picker is a drop zone whose file input is hidden.
    await expect(page.locator('#voucherForm input:visible')).toHaveCount(7);
    await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
    await expect(page.getByText('Fotos del comprobante (galería)*')).toBeVisible();
    await expect(photoTrigger(page)).toBeVisible();
    await expect(photoTrigger(page)).toContainText('Arrastrá tus fotos acá o');
    await expect(page.locator('#fotosHelp')).toContainText('Hasta 50 MB en total.');
    await expect(photoTrigger(page)).toHaveAttribute('aria-describedby', 'fotosHelp');
    await photoPickerReady(page);
    await expect(page.locator('.dz-hidden-input')).toHaveAttribute('accept', 'image/*');
    await expect(page.locator('.dz-hidden-input')).toHaveAttribute('multiple', 'multiple');
    await expect(photoPreviews(page)).toHaveCount(0);
  });

  test('the photos can be picked with the file chooser opened by the drop zone', async ({ page, mock }) => {
    await page.goto('/vouchers');
    await photoPickerReady(page);

    const chooser = page.waitForEvent('filechooser');
    await photoTrigger(page).click();
    const fileChooser = await chooser;
    expect(fileChooser.isMultiple()).toBe(true);
    await fileChooser.setFiles([fakePng('desde-chooser.png')]);

    await expect(photoPreviews(page)).toHaveCount(1);
    await fillVoucher(page, {}, []);
    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');
    expect(fileParts(mock.calls('POST', '/api/vouchers')[0].multipart).map((file) => file.filename)).toEqual([
      'desde-chooser.png',
    ]);
  });

  test('the drop zone opens the file chooser from the keyboard', async ({ page }) => {
    await page.goto('/vouchers');
    await photoPickerReady(page);

    await photoTrigger(page).focus();
    const chooser = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await chooser;
  });

  test('files dropped on the drop zone are listed and sent', async ({ page, mock }) => {
    await page.goto('/vouchers');
    await photoPickerReady(page);

    const dataTransfer = await page.evaluateHandle((base64) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'arrastrada.png', { type: 'image/png' }));
      return transfer;
    }, PNG_BUFFER.toString('base64'));
    await photoPicker(page).dispatchEvent('drop', { dataTransfer });

    await expect(photoPreviews(page)).toHaveCount(1);
    await fillVoucher(page, {}, []);
    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');
    expect(fileParts(mock.calls('POST', '/api/vouchers')[0].multipart).map((file) => file.filename)).toEqual([
      'arrastrada.png',
    ]);
  });

  test('each selected photo gets a preview card with its name and size', async ({ page }) => {
    await page.goto('/vouchers');
    await selectPhotos(page, [fakePng('comprobante-1.png'), fakePng('comprobante-2.jpeg')]);

    await expect(photoPreviews(page)).toHaveCount(2);
    const first = photoPreviews(page).nth(0);
    await expect(first.locator('[data-hs-file-upload-file-name]')).toHaveText('comprobante-1');
    await expect(first.locator('[data-hs-file-upload-file-ext]')).toHaveText('png');
    await expect(first.locator('[data-hs-file-upload-file-size]')).toHaveText(`${PNG_BUFFER.length}.00 B`);
    await expect(photoPreviews(page).nth(1).locator('[data-hs-file-upload-file-ext]')).toHaveText('jpeg');
    // Nothing is uploaded by the widget itself: the progress bar stays at 0 and no request leaves the page.
    await expect(first.locator('[data-hs-file-upload-progress-bar-value]')).toHaveText('0');
  });

  test('the trash button removes a photo and the POST carries only the remaining ones', async ({ page, mock }) => {
    await page.goto('/vouchers');
    await fillVoucher(page, {}, [fakePng('uno.png'), fakePng('dos.png'), fakePng('tres.png')]);
    await expect(photoPreviews(page)).toHaveCount(3);

    await photoRemoveButtons(page).nth(1).click();
    await expect(photoPreviews(page)).toHaveCount(2);
    await expect(photoPreviews(page).locator('[data-hs-file-upload-file-name]')).toHaveText(['uno', 'tres']);

    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');

    const [request] = mock.calls('POST', '/api/vouchers');
    expect(request.multipart.map((part) => part.name)).toEqual([
      'nombre', 'apellido', 'dni', 'email', 'ref4', 'hab', 'monto', 'timestamp', 'files', 'files',
    ]);
    expect(fileParts(request.multipart).map((file) => file.filename)).toEqual(['uno.png', 'tres.png']);
  });

  test('removing every photo brings back the "no image attached" validation', async ({ page, mock }) => {
    await page.goto('/vouchers');
    await fillVoucher(page);
    await photoRemoveButtons(page).first().click();
    await expect(photoPreviews(page)).toHaveCount(0);

    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText('Debes adjuntar al menos una imagen del comprobante');
    expect(mock.calls('POST', '/api/vouchers')).toHaveLength(0);
  });

  test('a file that is not an image is flagged right away, in its card and in a banner', async ({ page }) => {
    await page.goto('/vouchers');
    await selectPhotos(page, [fakePng('ok.png'), fakeTextFile('notas.txt')]);

    await expect(banner(page)).toHaveText('Solo se permiten imágenes');
    await expect(photoPreviews(page)).toHaveCount(2);
    await expect(photoPreviews(page).nth(1).getByRole('alert')).toHaveText('Solo se permiten imágenes');
    await expect(photoPreviews(page).nth(0).getByRole('alert')).toHaveCount(0);
  });

  test('the same photo can be selected again after removing it', async ({ page }) => {
    await page.goto('/vouchers');
    await selectPhotos(page, [fakePng('repetida.png')]);
    await photoRemoveButtons(page).click();
    await expect(photoPreviews(page)).toHaveCount(0);

    await selectPhotos(page, [fakePng('repetida.png')]);
    await expect(photoPreviews(page)).toHaveCount(1);
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
    await expect(photoPreviews(page)).toHaveCount(0);
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

  const FAILURE_MESSAGE = 'No se pudo enviar el comprobante. Revisá tu conexión e intentá nuevamente.';

  for (const { title, response } of SERVER_FAILURES) {
    test(`${title} shows an error banner, keeps the form and stores nothing locally`, async ({ page, mock }) => {
      mock.on('POST', '/api/vouchers', response);
      await page.goto('/vouchers');
      const data = await fillVoucher(page, {}, [fakePng('comprobante-1.png')]);
      await page.locator('#submitBtn').click();

      await expect(banner(page)).toHaveText(FAILURE_MESSAGE);
      await expect(banner(page)).toHaveCSS('background-color', 'rgb(254, 215, 215)');
      await expect(page.locator('#submitBtn')).toHaveText('Enviar Voucher');
      await expect(page.locator('#submitBtn')).toBeEnabled();
      // The form is NOT reset on failure: the user keeps what was typed and the selected file.
      for (const [field, value] of Object.entries(data)) {
        await expect(page.locator(`#${field}`)).toHaveValue(value);
      }
      await expect(photoPreviews(page)).toHaveCount(1);
      expect(await pendingVouchers(page)).toEqual([]);
    });
  }

  test('after a failure the user can retry with the same data and it succeeds', async ({ page, mock }) => {
    mock.on('POST', '/api/vouchers', { status: 503, json: {} });
    await page.goto('/vouchers');
    await fillVoucher(page);
    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText(FAILURE_MESSAGE);
    await expect(photoPreviews(page)).toHaveCount(1);

    mock.on('POST', '/api/vouchers', { json: { success: true } });
    await page.locator('#submitBtn').click();
    await expect(banner(page)).toHaveText('¡Voucher enviado correctamente!');
    expect(mock.calls('POST', '/api/vouchers')).toHaveLength(2);
    expect(fileParts(mock.calls('POST', '/api/vouchers')[1].multipart)).toHaveLength(1);
    expect(await pendingVouchers(page)).toEqual([]);
    await expect(page.locator('#nombre')).toHaveValue('');
  });
});

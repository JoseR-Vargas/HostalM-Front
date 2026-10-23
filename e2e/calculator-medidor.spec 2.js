import { fakeOversizedPng, fakePng, fakeTextFile } from './support/files.js';
import { expect, FAKE_TOKEN, FIXED_NOW, test } from './support/fixtures.js';
import { fileParts, textFields } from './support/multipart.js';

const PRICE_PER_KWH = 439.26;
const PAGE = '/calculator-medidor';

// Synthetic DNI that satisfies the field's native min/max (1000000..99999999).
const PERSON = {
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  dni: '10000001',
  habitacion: 'Hab 4',
};

const group = (page, field) => page.locator(`#${field}`).locator('xpath=ancestor::div[contains(@class,"form-group")][1]');
const groupError = (page, field) => group(page, field).locator('.error-message');
const photoGroup = (page, field) => page.locator(`#${field}Group`);

async function fillPerson(page, overrides = {}) {
  for (const [field, value] of Object.entries({ ...PERSON, ...overrides })) {
    await page.locator(`#${field}`).fill(value);
  }
}

async function fillReadings(page, anterior, actual) {
  await page.locator('#medicionAnterior').fill(anterior);
  await page.locator('#medicionAnterior').blur();
  await page.locator('#medicionActual').fill(actual);
  await page.locator('#medicionActual').blur();
}

async function attachPhotos(page, { anterior = fakePng('antes.png'), actual = fakePng('despues.png') } = {}) {
  if (anterior) await page.locator('#fotoAnterior').setInputFiles(anterior);
  if (actual) await page.locator('#fotoActual').setInputFiles(actual);
}

const submit = (page) => page.locator('#submitBtn').click();

/** Collects (and accepts) every alert/confirm the page opens. */
function collectDialogs(page) {
  const messages = [];
  page.on('dialog', (dialog) => {
    messages.push(dialog.message());
    dialog.accept();
  });
  return messages;
}

const stored = (page, key) => page.evaluate((name) => JSON.parse(localStorage.getItem(name) || 'null'), key);

test.describe('meter calculator (public)', () => {
  test('renders the form and hides the preview until there is a consumption', async ({ page }) => {
    await page.goto(PAGE);

    await expect(page.locator('.section-title')).toHaveText('Calculadora de Medidor');
    await expect(page.locator('#calculatorForm .form-group')).toHaveCount(6);
    await expect(page.locator('.photo-upload-group')).toHaveCount(2);
    await expect(page.locator('.upload-btn')).toHaveText(['Tomar foto', 'Galería', 'Tomar foto', 'Galería']);
    await expect(page.locator('#submitBtn')).toHaveText('Enviar');
    await expect(page.locator('#calculationPreview')).not.toHaveClass(/show/);
    await expect(page.locator('#resultModal')).not.toHaveClass(/show/);
  });

  test('a valid submit posts the multipart calculation and shows the result modal', async ({ page, mock }) => {
    await page.goto(PAGE);
    await fillPerson(page);
    await fillReadings(page, '1000.0', '1060.5');
    await expect(page.locator('#calculationPreview')).toHaveClass(/show/);
    await expect(page.locator('#consumoCalculado')).toHaveText('60.5 kWh');
    await attachPhotos(page);
    await submit(page);

    await expect(page.locator('#resultModal')).toHaveClass(/show/);
    await expect(page.locator('#modalAmount')).toHaveText('60.5 kWh');
    await expect(page.locator('#resultModal')).toContainText('Fecha tope de pago 05 de cada mes');

    const [request] = mock.calls('POST', '/api/calculos-medidor');
    expect(request.origin).toBe('http://localhost:3000');
    expect(request.headers.authorization).toBeUndefined();
    expect(request.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);

    expect(request.multipart.map((part) => part.name)).toEqual([
      'nombre',
      'apellido',
      'dni',
      'habitacion',
      'medicionAnterior',
      'medicionActual',
      'consumoCalculado',
      'montoTotal',
      'precioKWH',
      'fechaRegistro',
      'timestamp',
      'fotoAnterior',
      'fotoActual',
    ]);

    // Price math: consumption x 439.26.
    const consumo = 1060.5 - 1000;
    expect(textFields(request.multipart)).toEqual({
      ...PERSON,
      medicionAnterior: '1000',
      medicionActual: '1060.5',
      consumoCalculado: String(consumo),
      montoTotal: String(consumo * PRICE_PER_KWH),
      precioKWH: '439.26',
      fechaRegistro: FIXED_NOW.replace('Z', '.000Z'),
      timestamp: String(new Date(FIXED_NOW).getTime()),
    });
    expect(Number(textFields(request.multipart).montoTotal)).toBeCloseTo(26575.23, 2);

    const files = fileParts(request.multipart);
    expect(files.map((file) => [file.name, file.filename, file.contentType])).toEqual([
      ['fotoAnterior', 'antes.png', 'image/png'],
      ['fotoActual', 'despues.png', 'image/png'],
    ]);
  });

  test('sends the admin token when someone is signed in', async ({ page, mock, signIn }) => {
    await signIn();
    await page.goto(PAGE);
    await fillPerson(page);
    await fillReadings(page, '1000.0', '1010.0');
    await attachPhotos(page);
    await submit(page);

    await expect(page.locator('#resultModal')).toHaveClass(/show/);
    expect(mock.calls('POST', '/api/calculos-medidor')[0].headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`);
  });

  test('normalizes readings: commas become dots and integers get the decimal before the last digit', async ({
    page,
    mock,
  }) => {
    await page.goto(PAGE);
    await fillPerson(page);

    // Integer entry (35659 -> 3565.9): the live preview normalizes it, but the field itself keeps
    // what was typed and the strict format check flags it (production behavior).
    await page.locator('#medicionAnterior').fill('35659');
    await page.locator('#medicionAnterior').blur();
    await expect(page.locator('#medicionAnterior')).toHaveValue('35659');
    await expect(group(page, 'medicionAnterior')).toHaveClass(/error/);

    await page.locator('#medicionActual').fill('3572,1');
    await page.locator('#medicionActual').blur();
    await expect(page.locator('#medicionActual')).toHaveValue('3572.1');
    await expect(page.locator('#consumoCalculado')).toHaveText('6.2 kWh');

    await attachPhotos(page);
    await submit(page);
    await expect(group(page, 'medicionAnterior')).toHaveClass(/error/);
    await expect(page.locator('#resultModal')).not.toHaveClass(/show/);
    expect(mock.calls('POST', '/api/calculos-medidor')).toHaveLength(0);

    await page.locator('#medicionAnterior').fill('3565,9');
    await page.locator('#medicionAnterior').blur();
    await expect(page.locator('#medicionAnterior')).toHaveValue('3565.9');
    await expect(group(page, 'medicionAnterior')).not.toHaveClass(/error/);

    await submit(page);
    await expect(page.locator('#modalAmount')).toHaveText('6.2 kWh');

    const fields = textFields(mock.calls('POST', '/api/calculos-medidor')[0].multipart);
    expect(fields.medicionAnterior).toBe('3565.9');
    expect(fields.medicionActual).toBe('3572.1');
    expect(fields.consumoCalculado).toBe(String(3572.1 - 3565.9));
  });

  test('measurement fields only accept digits and one separator', async ({ page }) => {
    await page.goto(PAGE);

    await page.locator('#medicionAnterior').fill('1a2b3.4,5x');
    await expect(page.locator('#medicionAnterior')).toHaveValue('123.45');
  });

  test('a measurement without decimals after the separator is rejected on blur', async ({ page }) => {
    await page.goto(PAGE);
    await page.locator('#medicionAnterior').fill('123.');
    await page.locator('#medicionAnterior').blur();

    await expect(group(page, 'medicionAnterior')).toHaveClass(/error/);
    await expect(groupError(page, 'medicionAnterior')).toHaveText(
      'Formato requerido: número con punto o coma decimal (Ej: 408.7 o 0035,3)',
    );
  });

  test('the result modal closes and the form is reset', async ({ page }) => {
    await page.goto(PAGE);
    await fillPerson(page);
    await fillReadings(page, '1000.0', '1060.5');
    await attachPhotos(page);
    await submit(page);

    await expect(page.locator('#resultModal')).toHaveClass(/show/);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.locator('.close-modal').click();
    await expect(page.locator('#resultModal')).not.toHaveClass(/show/);

    for (const field of ['nombre', 'apellido', 'dni', 'habitacion', 'medicionAnterior', 'medicionActual']) {
      await expect(page.locator(`#${field}`)).toHaveValue('');
    }
    await expect(page.locator('#calculationPreview')).not.toHaveClass(/show/);
    await expect(page.locator('#fotoAnteriorPreview')).toBeHidden();
    await expect(photoGroup(page, 'fotoAnterior')).not.toHaveClass(/has-photo/);
    await expect(page.locator('#fotoActual')).toHaveValue('');
  });

  test('keeps the history locally and prefills the personal data next time', async ({ page }) => {
    await page.goto(PAGE);
    await fillPerson(page);
    await fillReadings(page, '1000.0', '1060.5');
    await attachPhotos(page);
    await submit(page);
    await expect(page.locator('#resultModal')).toHaveClass(/show/);

    const history = await stored(page, 'meterCalculations');
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ ...PERSON, medicionAnterior: 1000, medicionActual: 1060.5, precioKWH: 439.26 });
    expect(history[0]).not.toHaveProperty('fotoAnterior');
    expect(await stored(page, 'lastCalculation')).toMatchObject(PERSON);

    await page.reload();
    for (const [field, value] of Object.entries(PERSON)) {
      await expect(page.locator(`#${field}`)).toHaveValue(value);
    }
    await expect(page.locator('#medicionAnterior')).toHaveValue('');
  });

  test('picking a photo shows its preview', async ({ page }) => {
    await page.goto(PAGE);
    await attachPhotos(page, { actual: null });

    await expect(page.locator('#fotoAnteriorPreview')).toBeVisible();
    await expect(page.locator('#fotoAnteriorPreview')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await expect(photoGroup(page, 'fotoAnterior')).toHaveClass(/has-photo/);
    await expect(page.locator('#fotoActualPreview')).toBeHidden();
  });

  test('the camera button asks for the rear camera, the gallery button does not', async ({ page }) => {
    await page.goto(PAGE);
    const input = page.locator('#fotoAnterior');
    const buttons = photoGroup(page, 'fotoAnterior').locator('.upload-btn');

    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), buttons.first().click()]);
    expect(chooser.isMultiple()).toBe(false);
    await expect(input).toHaveAttribute('capture', 'environment');

    const [galleryChooser] = await Promise.all([page.waitForEvent('filechooser'), buttons.last().click()]);
    expect(galleryChooser.isMultiple()).toBe(false);
    await expect(input).not.toHaveAttribute('capture', /.*/);
  });

  test.describe('validation', () => {
    test('an empty form flags the required fields and both photos, and sends nothing', async ({ page, mock }) => {
      await page.goto(PAGE);
      await submit(page);

      for (const field of ['nombre', 'apellido', 'dni', 'habitacion', 'medicionAnterior']) {
        await expect(group(page, field)).toHaveClass(/error/);
        await expect(groupError(page, field)).toBeVisible();
        await expect(groupError(page, field)).toHaveText('Este campo es requerido');
      }
      await expect(photoGroup(page, 'fotoAnterior').locator('.error-message')).toHaveText(
        'Debe cargar la foto del medidor del mes anterior',
      );
      await expect(photoGroup(page, 'fotoActual').locator('.error-message')).toHaveText(
        'Debe cargar la foto del medidor del mes actual',
      );
      await expect(page.locator('.photo-upload-group.error')).toHaveCount(2);

      // The current reading keeps its "required" error visible too.
      await expect(group(page, 'medicionActual')).toHaveClass(/error/);
      await expect(groupError(page, 'medicionActual')).toHaveText('Este campo es requerido');

      expect(mock.calls('POST', '/api/calculos-medidor')).toHaveLength(0);
      await expect(page.locator('#resultModal')).not.toHaveClass(/show/);
    });

    test('a current reading that is not greater than the previous one is rejected', async ({ page, mock }) => {
      await page.goto(PAGE);
      await fillPerson(page);
      await fillReadings(page, '1060.5', '1000.0');
      await expect(page.locator('#calculationPreview')).not.toHaveClass(/show/);
      await attachPhotos(page);
      await submit(page);

      await expect(group(page, 'medicionActual')).toHaveClass(/error/);
      await expect(groupError(page, 'medicionActual')).toHaveText('La medición actual debe ser mayor a la anterior');
      expect(mock.calls('POST', '/api/calculos-medidor')).toHaveLength(0);
    });

    test('equal readings are rejected too', async ({ page, mock }) => {
      await page.goto(PAGE);
      await fillPerson(page);
      await fillReadings(page, '1000.0', '1000.0');
      await attachPhotos(page);
      await submit(page);

      await expect(groupError(page, 'medicionActual')).toHaveText('La medición actual debe ser mayor a la anterior');
      expect(mock.calls('POST', '/api/calculos-medidor')).toHaveLength(0);
    });

    for (const dni of ['123', '123456789']) {
      test(`DNI "${dni}" is flagged while typing and blocks the submit`, async ({ page, mock }) => {
        await page.goto(PAGE);
        await fillPerson(page, { dni });

        await expect(group(page, 'dni')).toHaveClass(/error/);
        await expect(groupError(page, 'dni')).toHaveText('Ingrese un DNI válido (7-8 dígitos)');

        await fillReadings(page, '1000.0', '1060.5');
        await attachPhotos(page);
        // The native min/max of the number input blocks the submit before the app validation.
        await submit(page);

        await expect(groupError(page, 'dni')).toHaveText('Ingrese un DNI válido (7-8 dígitos)');
        expect(mock.calls('POST', '/api/calculos-medidor')).toHaveLength(0);
      });
    }

    test('a valid DNI clears the error', async ({ page }) => {
      await page.goto(PAGE);
      await page.locator('#dni').fill('123');
      await expect(group(page, 'dni')).toHaveClass(/error/);

      await page.locator('#dni').fill('12345678');
      await expect(group(page, 'dni')).not.toHaveClass(/error/);
    });

    test('one missing photo is flagged on its own', async ({ page, mock }) => {
      await page.goto(PAGE);
      await fillPerson(page);
      await fillReadings(page, '1000.0', '1060.5');
      await attachPhotos(page, { actual: null });
      await submit(page);

      await expect(photoGroup(page, 'fotoActual')).toHaveClass(/error/);
      await expect(photoGroup(page, 'fotoActual').locator('.error-message')).toHaveText(
        'Debe cargar la foto del medidor del mes actual',
      );
      await expect(photoGroup(page, 'fotoAnterior')).not.toHaveClass(/error/);
      expect(mock.calls('POST', '/api/calculos-medidor')).toHaveLength(0);
    });

    test('choosing the missing photo clears its error', async ({ page }) => {
      await page.goto(PAGE);
      await submit(page);
      await expect(photoGroup(page, 'fotoAnterior')).toHaveClass(/error/);

      await attachPhotos(page, { actual: null });
      await expect(photoGroup(page, 'fotoAnterior')).not.toHaveClass(/error/);
      await expect(photoGroup(page, 'fotoAnterior').locator('.error-message')).toBeHidden();
    });

    test('a non-image file is refused with an alert', async ({ page }) => {
      const dialogs = collectDialogs(page);
      await page.goto(PAGE);
      await attachPhotos(page, { anterior: fakeTextFile('notas.txt'), actual: null });

      await expect.poll(() => dialogs).toEqual(['Por favor seleccione un archivo de imagen válido']);
      await expect(page.locator('#fotoAnteriorPreview')).toBeHidden();
      await expect(photoGroup(page, 'fotoAnterior')).not.toHaveClass(/has-photo/);

      // The input is emptied when a photo is rejected, so the refused file is never uploaded.
      await expect(page.locator('#fotoAnterior')).toHaveValue('');
    });

    test('a photo over 5MB is refused with an alert', async ({ page }) => {
      const dialogs = collectDialogs(page);
      await page.goto(PAGE);
      await attachPhotos(page, { anterior: fakeOversizedPng(), actual: null });

      await expect
        .poll(() => dialogs)
        .toEqual(['La imagen es muy grande. Por favor seleccione una imagen menor a 5MB']);
      await expect(photoGroup(page, 'fotoAnterior')).not.toHaveClass(/has-photo/);
      await expect(page.locator('#fotoAnterior')).toHaveValue('');
    });
  });

  test.describe('server failures', () => {
    const FAILURES = [
      { title: 'a 500 with a message', response: { status: 500, json: { message: 'Base de datos caída' } }, detail: 'Base de datos caída' },
      { title: 'a 500 without a body', response: { status: 500, body: 'oops' }, detail: 'Error desconocido' },
      { title: 'success: false', response: { json: { success: false, message: 'Datos rechazados' } }, detail: 'Datos rechazados' },
    ];

    for (const { title, response, detail } of FAILURES) {
      test(`${title} alerts that the reading was NOT registered and shows no result`, async ({ page, mock }) => {
        mock.on('POST', '/api/calculos-medidor', response);
        const dialogs = collectDialogs(page);
        await page.goto(PAGE);
        await fillPerson(page);
        await fillReadings(page, '1000.0', '1060.5');
        await attachPhotos(page);
        await submit(page);

        await expect
          .poll(() => dialogs)
          .toEqual([
            'No se pudo enviar la medición al servidor.\n\n' +
              'La lectura NO fue registrada. Podés intentar nuevamente cuando tengas conexión; ' +
              'los datos del formulario se conservaron.\n\n' +
              `Detalle: ${detail}`,
          ]);
        await expect(page.locator('#resultModal')).not.toHaveClass(/show/);
        await expect(page.locator('#submitBtn')).toHaveText('Enviar');
        await expect(page.locator('#submitBtn')).toBeEnabled();
        // The form keeps its data for another try.
        await expect(page.locator('#nombre')).toHaveValue(PERSON.nombre);

        expect(await stored(page, 'pendingSyncCalculations')).toBeNull();
        expect(await stored(page, 'meterCalculations')).toBeNull();
      });
    }

    test('the button shows progress while sending', async ({ page, mock }) => {
      mock.on('POST', '/api/calculos-medidor', { delayMs: 600, json: { success: true } });
      await page.goto(PAGE);
      await fillPerson(page);
      await fillReadings(page, '1000.0', '1060.5');
      await attachPhotos(page);
      await submit(page);

      await expect(page.locator('#submitBtn')).toHaveText('Procesando...');
      await expect(page.locator('#submitBtn')).toBeDisabled();
      await expect(page.locator('#resultModal')).toHaveClass(/show/);
      await expect(page.locator('#submitBtn')).toHaveText('Enviar');
    });
  });
});

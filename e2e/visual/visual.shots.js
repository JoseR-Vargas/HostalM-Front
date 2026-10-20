import { fakePng } from '../support/files.js';
import { CURRENT_MONTH_LABEL, dayOfMonth, expect, test } from '../support/fixtures.js';

// TEMPORARY visual-regression suite (removed in task S4 together with playwright.visual.config.js).
// Run through `npm run e2e:visual[:update]`; see the config for the baseline location.
//
// Determinism: fixed clock + mocked backends (support/fixtures), fonts stubbed by the mock guard
// (system fallback fonts), CSS animations/transitions/smooth scroll switched off, every image and
// font awaited, lazy images and scroll-reveal blocks forced in before the capture.

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

// A visible stand-in for backend images (the 1x1 default PNG would make every thumbnail invisible).
const PHOTO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b6cb0"/>' +
  '<stop offset="1" stop-color="#ed8936"/></linearGradient></defs>' +
  '<rect width="160" height="120" fill="url(#g)"/><circle cx="80" cy="60" r="30" fill="#fff" opacity=".6"/></svg>';
const SVG_RESPONSE = { body: PHOTO_SVG, contentType: 'image/svg+xml' };

// A real image for the file inputs (the app only checks `type.startsWith('image/')`).
const photoFile = (name) => ({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(PHOTO_SVG) });

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
    _id: 'v2',
    nombre: '[TEST] Beto con un nombre bastante largo',
    apellido: 'Ejemplo',
    dni: '10000002',
    email: 'una.direccion.larga@example.invalid',
    ref4: '4321',
    hab: 'Apto 2',
    monto: '1.250.000,50',
    createdAt: dayOfMonth(12),
    fotos: ['beto.jpg', 'beto2.jpg'],
  },
];

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
    nombre: '[TEST] Carla',
    apellido: 'Diez',
    dni: '10000003',
    habitacion: 'Hab 10',
    medicionAnterior: 10,
    medicionActual: 30,
    consumoCalculado: 20,
    montoTotal: 8785.2,
    fechaRegistro: dayOfMonth(3),
  },
];

const VOUCHER_FORM = {
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  dni: '00000001',
  email: 'ana@example.invalid',
  ref4: '1234',
  hab: 'Hab 4',
  monto: '50.000',
};

const CONTACT_FORM = {
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  dni: '00000001',
  email: 'ana@example.invalid',
};

const PERSON = { nombre: '[TEST] Ana', apellido: 'Prueba', dni: '10000001', habitacion: 'Hab 4' };

const fillFields = async (page, fields) => {
  for (const [field, value] of Object.entries(fields)) {
    await page.locator(`#${field}`).fill(value);
  }
};

const useBackendImages = (mock) => {
  mock.on('GET', '/uploads/vouchers/:name', SVG_RESPONSE);
  mock.on('GET', '/api/calculos-medidor/:id/foto-anterior', SVG_RESPONSE);
  mock.on('GET', '/api/calculos-medidor/:id/foto-actual', SVG_RESPONSE);
};

/**
 * Makes the page screenshot-ready: fonts loaded, every block revealed (the scroll-reveal fade-in
 * and lazy images only trigger once scrolled into view), every image decoded, back on top.
 */
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(200, Math.floor(window.innerHeight / 2));
    const bottom = document.documentElement.scrollHeight;
    for (let y = 0; y <= bottom; y += step) {
      window.scrollTo(0, y);
      window.dispatchEvent(new Event('scroll'));
      await pause(60);
    }
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('scroll'));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.waitForFunction(() => [...document.images].every((image) => !image.src || image.complete));
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode().catch(() => {}))));
  await page.mouse.move(0, 0);
  // Reveal blocks fade in through React state: let the commit land before the capture.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

for (const viewport of VIEWPORTS) {
  test.describe(`visual ${viewport.width}px`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ context }) => {
      // Transitions are not covered by the fixture (it only kills animations); smooth scrolling
      // would also leave the page mid-scroll when the banners scrollIntoView.
      await context.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent =
            '*, *::before, *::after { animation: none !important; transition: none !important;' +
            ' scroll-behavior: auto !important; caret-color: transparent !important; }';
          document.head.appendChild(style);
        });
      });
    });

    /** Screenshot name -> `<name>-<width>.png` in the (gitignored) baseline folder. */
    const shot = async (page, name, { fullPage = true } = {}) => {
      await settle(page);
      await expect(page).toHaveScreenshot(`${name}-${viewport.width}.png`, { fullPage });
    };

    test.describe('public pages', () => {
      test('home', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.hero-title')).toBeVisible();
        await shot(page, 'home');
      });

      test('home - contact form error', async ({ page }) => {
        await page.goto('/');
        await fillFields(page, { ...CONTACT_FORM, nombre: '   ', email: 'a@b' });
        await page.locator('#huespedes').selectOption('3');
        await page.locator('#tipo').selectOption('apartamento');
        await page.locator('.submit-button').click();
        await expect(page.locator('#contactForm .error-message')).toBeVisible();
        await shot(page, 'home-contact-error');
      });

      test('login', async ({ page }) => {
        await page.goto('/login');
        await expect(page.locator('#loginBtn')).toBeVisible();
        await shot(page, 'login');
      });

      test('login - validation error', async ({ page }) => {
        await page.goto('/login');
        await page.locator('#email').fill('a@b');
        await page.locator('#password').fill('TestPass!123456');
        await page.locator('#loginBtn').click();
        await expect(page.locator('#loginError')).toBeVisible();
        await shot(page, 'login-error');
      });

      test('vouchers', async ({ page }) => {
        await page.goto('/vouchers');
        await expect(page.locator('#submitBtn')).toBeVisible();
        await shot(page, 'vouchers');
      });

      test('vouchers - validation banner', async ({ page }) => {
        await page.goto('/vouchers');
        await page.locator('#submitBtn').click();
        await expect(page.locator('.voucher-banner')).toHaveText('El nombre es requerido');
        await shot(page, 'vouchers-validation-banner');
      });

      test('vouchers - upload error banner with the filled form', async ({ page, mock }) => {
        mock.on('POST', '/api/vouchers', { status: 500, json: { message: 'boom' } });
        await page.goto('/vouchers');
        await fillFields(page, VOUCHER_FORM);
        await page.locator('#fotos').setInputFiles(fakePng('comprobante-1.png'));
        await page.locator('#submitBtn').click();
        await expect(page.locator('.voucher-banner')).toHaveText(
          'No se pudo enviar el comprobante. Revisá tu conexión e intentá nuevamente.',
        );
        await shot(page, 'vouchers-error-banner');
      });

      test('calculator-medidor', async ({ page }) => {
        await page.goto('/calculator-medidor');
        await expect(page.locator('#submitBtn')).toBeVisible();
        await shot(page, 'calculator-medidor');
      });

      test('calculator-medidor - validation errors', async ({ page }) => {
        await page.goto('/calculator-medidor');
        await page.locator('#submitBtn').click();
        await expect(page.locator('#calculatorForm .error-message').first()).toBeVisible();
        await shot(page, 'calculator-medidor-errors');
      });

      test('calculator-medidor - filled form with photos and preview', async ({ page }) => {
        await page.goto('/calculator-medidor');
        await fillFields(page, PERSON);
        await page.locator('#medicionAnterior').fill('1000.0');
        await page.locator('#medicionActual').fill('1060.5');
        await page.locator('#fotoAnterior').setInputFiles(photoFile('antes.svg'));
        await page.locator('#fotoActual').setInputFiles(photoFile('despues.svg'));
        await expect(page.locator('#calculationPreview')).toHaveClass(/show/);
        await expect(page.locator('#fotoAnteriorPreview')).toBeVisible();
        await expect(page.locator('#fotoActualPreview')).toBeVisible();
        await shot(page, 'calculator-medidor-filled');
      });

      test('calculator-medidor - result modal', async ({ page }) => {
        await page.goto('/calculator-medidor');
        await fillFields(page, PERSON);
        await page.locator('#medicionAnterior').fill('1000.0');
        await page.locator('#medicionActual').fill('1060.5');
        await page.locator('#fotoAnterior').setInputFiles(photoFile('antes.svg'));
        await page.locator('#fotoActual').setInputFiles(photoFile('despues.svg'));
        await page.locator('#submitBtn').click();
        await expect(page.locator('#resultModal')).toHaveClass(/show/);
        await expect(page.locator('#modalAmount')).toHaveText('60.5 kWh');
        await shot(page, 'calculator-medidor-result-modal', { fullPage: false });
      });
    });

    test.describe('admin pages', () => {
      test.beforeEach(async ({ signIn }) => {
        await signIn();
      });

      test('dashboard', async ({ page, mock }) => {
        useBackendImages(mock);
        mock.on('GET', '/api/vouchers', { json: { success: true, data: VOUCHERS } });
        await page.goto('/dashboard');
        await expect(page.locator('#currentMonthLabel')).toHaveText(CURRENT_MONTH_LABEL);
        await expect(page.locator('#voucherTableBody tr')).toHaveCount(2);
        await shot(page, 'dashboard');
      });

      test('dashboard - image modal', async ({ page, mock }) => {
        useBackendImages(mock);
        mock.on('GET', '/api/vouchers', { json: { success: true, data: VOUCHERS } });
        await page.goto('/dashboard');
        await expect(page.locator('#voucherTableBody tr')).toHaveCount(2);
        await settle(page);
        await page.locator('#voucherTableBody img[title="Clic para ver completa"]').first().click();
        await expect(page.locator('#imageModal')).toHaveClass(/show/);
        await expect(page.locator('#modalImageName')).toHaveText('comp1.png');
        await shot(page, 'dashboard-image-modal', { fullPage: false });
      });

      test('dashboard - empty month', async ({ page, mock }) => {
        mock.on('GET', '/api/vouchers', { json: { success: true, data: [] } });
        await page.goto('/dashboard');
        // An empty table has no rows, so it is attached but has no visible box.
        await expect(page.locator('#voucherTable')).toHaveCount(1);
        await expect(page.locator('#vouchersLoadError')).toHaveCount(0);
        await expect(page.locator('#currentMonthLabel')).toHaveText(CURRENT_MONTH_LABEL);
        await shot(page, 'dashboard-empty');
      });

      test('dashboard - load error state', async ({ page, mock }) => {
        mock.on('GET', '/api/vouchers', { status: 500, json: { message: 'boom' } });
        await page.goto('/dashboard');
        await expect(page.locator('#vouchersLoadError')).toBeVisible();
        await shot(page, 'dashboard-error');
      });

      test('dashboard-calculator', async ({ page, mock }) => {
        useBackendImages(mock);
        mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: CALCULOS } });
        await page.goto('/dashboard-calculator');
        await expect(page.locator('#currentMonthLabel')).toHaveText(CURRENT_MONTH_LABEL);
        await expect(page.locator('#calculatorTableBody tr')).toHaveCount(3);
        await shot(page, 'dashboard-calculator');
      });

      test('dashboard-calculator - photo modal', async ({ page, mock }) => {
        useBackendImages(mock);
        mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: CALCULOS } });
        await page.goto('/dashboard-calculator');
        await expect(page.locator('#calculatorTableBody tr')).toHaveCount(3);
        await settle(page);
        await page.locator('#calculatorTableBody img.foto-medidor-preview').first().click();
        await expect(page.locator('#imageModal')).toHaveClass(/show/);
        await expect(page.locator('#imageModalTitle')).toHaveText('Medición Anterior - Hab 4');
        await shot(page, 'dashboard-calculator-photo-modal', { fullPage: false });
      });

      test('dashboard-calculator - empty month', async ({ page, mock }) => {
        mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: [] } });
        await page.goto('/dashboard-calculator');
        await expect(page.locator('#noDataMessage')).toBeVisible();
        await shot(page, 'dashboard-calculator-empty');
      });

      test('calcular-pago - step 1', async ({ page }) => {
        await page.goto('/calcular-pago');
        await expect(page.locator('#btnCalcularPrecio')).toBeVisible();
        await shot(page, 'calcular-pago-step1');
      });

      test('calcular-pago - step 1 validation errors', async ({ page }) => {
        await page.goto('/calcular-pago');
        await page.locator('#btnCalcularPrecio').click();
        await expect(page.locator('#montoFactura')).toBeVisible();
        await expect(page.locator('.form-group.error').first()).toBeVisible();
        await shot(page, 'calcular-pago-step1-errors');
      });

      test('calcular-pago - step 2 after calculating', async ({ page, mock }) => {
        mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: CALCULOS } });
        await page.goto('/calcular-pago');
        await page.locator('#montoFactura').fill('200.000,50');
        await page.locator('#totalKwhFactura').fill('450');
        await page.locator('#btnCalcularPrecio').click();
        await expect(page.locator('#precioKwh')).toHaveValue('444,45');
        await expect(page.locator('#residentesMonthLabel')).toHaveText(CURRENT_MONTH_LABEL);
        await expect(page.locator('#residentesTableBody tr')).toHaveCount(3);
        await shot(page, 'calcular-pago-step2');
      });

      test('calcular-pago - step 2 with a selected resident', async ({ page, mock }) => {
        mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: CALCULOS } });
        await page.goto('/calcular-pago');
        await page.locator('#montoFactura').fill('200.000,50');
        await page.locator('#totalKwhFactura').fill('450');
        await page.locator('#btnCalcularPrecio').click();
        await expect(page.locator('#residentesTableBody tr')).toHaveCount(3);
        await page.locator('[id="fila-Hab 4"]').getByRole('button', { name: 'Seleccionar' }).click();
        await expect(page.locator('#residenteSeleccionado')).toBeVisible();
        await shot(page, 'calcular-pago-step2-selected');
      });

      test('calcular-pago - residents load error', async ({ page, mock }) => {
        mock.on('GET', '/api/calculos-medidor', { status: 500, json: { message: 'boom' } });
        await page.goto('/calcular-pago');
        await page.locator('#montoFactura').fill('200.000,50');
        await page.locator('#totalKwhFactura').fill('450');
        await page.locator('#btnCalcularPrecio').click();
        await expect(page.locator('#residentesError')).toBeVisible();
        await shot(page, 'calcular-pago-step2-error');
      });

      for (const [path, name] of [
        ['/comprobante-pago', 'comprobante-pago'],
        ['/comprobante-servicios', 'comprobante-servicios'],
      ]) {
        test(`${name} - form`, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator('#btnGenerar')).toBeVisible();
          await expect(page.locator('#fechaRecibo')).toHaveValue('2026-03-15');
          await shot(page, name);
        });

        test(`${name} - validation errors`, async ({ page }) => {
          await page.goto(path);
          await page.locator('#fechaRecibo').fill('');
          await page.locator('#btnGenerar').click();
          await expect(page.locator('#group-cliente')).toHaveClass(/error/);
          await shot(page, `${name}-errors`);
        });
      }
    });
  });
}

import { fakePng } from './support/files.js';
import { dayOfMonth, expect, test } from './support/fixtures.js';
import { calendar, openCalendar, openPeriod, periodDropdown, pickersReady } from './support/receipt-pickers.js';
import { photoPreviews, selectPhotos } from './support/voucher-photos.js';

// Mobile layout checks (skill playwright-mobile-qa): no sideways scroll and reachable controls
// on a small phone and the narrowest one.
const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'narrow phone', width: 320, height: 568 },
];

const MIN_TARGET_PX = 24; // WCAG 2.2 SC 2.5.8
const MIN_ARROW_PX = 40; // month arrows are the primary controls of their card
const MAX_HEADER_RATIO = 0.3; // the fixed header may take at most ~30% of the viewport height

const VOUCHERS = [
  {
    _id: 'v1',
    nombre: '[TEST] Ana con un nombre bastante largo',
    apellido: 'Prueba Apellido Largo',
    dni: '10000001',
    email: 'una.direccion.muy.larga.de.correo@example.invalid',
    ref4: '1234',
    hab: 'Hab 4',
    monto: '1.250.000,50',
    timestamp: dayOfMonth(10),
    files: [{ name: 'comp1.png', url: '/uploads/vouchers/comp1.png' }],
  },
];

const CALCULOS = [
  {
    _id: 'c1',
    nombre: '[TEST] Ana con un nombre bastante largo',
    apellido: 'Prueba',
    dni: '10000001',
    habitacion: 'Humberto Primo 3070 - 3068',
    medicionAnterior: 1000,
    medicionActual: 1060.5,
    consumoCalculado: 60.5,
    montoTotal: 26575.23,
    fechaRegistro: dayOfMonth(10),
    fotoAnteriorData: { filename: 'a.png' },
    fotoActualData: { filename: 'b.png' },
  },
];

/**
 * Receipt forms: both pop-ups (the period select and the calendar) must fit the screen, without sideways scrolling
 * and with tap targets of at least 24px, and must be closed again afterwards (an open pop-up would cover the buttons
 * the generic checks look for).
 */
async function exerciseReceiptPickers(page) {
  const fitsAndIsTappable = (selector) =>
    page.evaluate(
      ({ selector, min }) => {
        const viewport = document.documentElement.clientWidth;
        const items = [...document.querySelectorAll(selector)].filter((item) => {
          const rect = item.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        return {
          count: items.length,
          outside: items.filter((item) => {
            const rect = item.getBoundingClientRect();
            return rect.left < -1 || rect.right > viewport + 1;
          }).length,
          small: items.filter((item) => {
            const rect = item.getBoundingClientRect();
            return rect.width < min || rect.height < min;
          }).length,
        };
      },
      { selector, min: MIN_TARGET_PX },
    );

  await pickersReady(page);

  await openPeriod(page);
  await expect(periodDropdown(page)).toBeVisible();
  const box = await periodDropdown(page).boundingBox();
  expect(box.x, 'period dropdown starts inside the screen').toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, 'period dropdown ends inside the screen').toBeLessThanOrEqual(page.viewportSize().width + 1);
  const options = await fitsAndIsTappable('[data-hs-select-dropdown].opened [data-value]');
  expect(options.count, 'period options on screen').toBeGreaterThan(0);
  expect(options.outside, 'period options outside the screen').toBe(0);
  expect(options.small, 'period options smaller than 24px').toBe(0);
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  await expect(periodDropdown(page)).toHaveCount(0);

  await openCalendar(page);
  // The plugin places the popup a moment after showing it (it measures the input first): wait for the final spot.
  await expect(async () => {
    const popup = await calendar(page).boundingBox();
    expect(popup.x, 'calendar starts inside the screen').toBeGreaterThanOrEqual(-1);
    expect(popup.x + popup.width, 'calendar ends inside the screen').toBeLessThanOrEqual(page.viewportSize().width + 1);
  }).toPass({ timeout: 5_000 });
  const days = await fitsAndIsTappable('.vc:not([data-vc-calendar-hidden]) [data-vc-date-btn]');
  expect(days.count, 'calendar days on screen').toBeGreaterThan(27);
  expect(days.outside, 'calendar days outside the screen').toBe(0);
  expect(days.small, 'calendar days smaller than 24px').toBe(0);
  const arrows = await fitsAndIsTappable('.vc:not([data-vc-calendar-hidden]) [data-vc-arrow]');
  expect(arrows.count, 'calendar arrows').toBe(2);
  expect(arrows.small, 'calendar arrows smaller than 24px').toBe(0);
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  await expect(calendar(page)).toHaveCount(0);
}

const PAGES = [
  { path: '/', buttons: ['.hero .cta-button', '.submit-button', '.nav-link', '#whatsappLink'] },
  { path: '/login', buttons: ['#loginBtn', '.nav-link'] },
  {
    path: '/vouchers',
    buttons: ['#submitBtn', '.nav-link'],
    // With previews on screen (one with a very long name): the drop zone and every trash button stay reachable.
    run: async (page) => {
      await selectPhotos(page, [
        fakePng('comprobante-de-transferencia-bancaria-con-un-nombre-extremadamente-largo-2026-03-15.png'),
        fakePng('comprobante-2.png'),
        fakePng('comprobante-3.png'),
      ]);
      await expect(photoPreviews(page)).toHaveCount(3);
      // A long name must be truncated, not push the trash button out of its card.
      const escaped = await photoPreviews(page).evaluateAll((cards) =>
        cards.filter((card) => {
          const button = card.querySelector('[data-hs-file-upload-remove]').getBoundingClientRect();
          return button.right > card.getBoundingClientRect().right;
        }).length,
      );
      expect(escaped, 'trash buttons sticking out of their preview card').toBe(0);
    },
    extraButtons: ['#fotos', '[data-hs-file-upload-remove]'],
  },
  { path: '/calculator-medidor', buttons: ['#submitBtn', '.upload-btn'] },
  {
    path: '/dashboard',
    admin: true,
    buttons: ['.logout-btn', '#prevMonth', '#nextMonth', '.nav-link'],
    prepare: (mock) => mock.on('GET', '/api/vouchers', { json: { success: true, data: VOUCHERS } }),
  },
  {
    path: '/dashboard-calculator',
    admin: true,
    buttons: ['.logout-btn', '#prevMonth', '#nextMonth', '.nav-link'],
    prepare: (mock) => mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: CALCULOS } }),
  },
  {
    path: '/calcular-pago',
    admin: true,
    buttons: ['.logout-btn', '#btnCalcularPrecio', '.nav-link'],
    prepare: (mock) => mock.on('GET', '/api/calculos-medidor', { json: { success: true, data: CALCULOS } }),
    run: async (page) => {
      await page.locator('#montoFactura').fill('200.000,50');
      await page.locator('#totalKwhFactura').fill('450');
      await page.locator('#btnCalcularPrecio').click();
      await expect(page.locator('#residentesTableBody tr')).toHaveCount(1);
      await page.locator('#residentesTableBody button').click();
      await expect(page.locator('#residenteSeleccionado')).toBeVisible();
    },
    extraButtons: [
      { selector: '#btnMesAnterior', minSize: MIN_ARROW_PX },
      { selector: '#btnMesSiguiente', minSize: MIN_ARROW_PX },
      '#residentesTableBody button',
    ],
  },
  {
    path: '/comprobante-pago',
    admin: true,
    buttons: ['.logout-btn', '#btnGenerar', '.nav-link'],
    run: exerciseReceiptPickers,
    // The period toggle (the native select is hidden by the plugin) and the date input.
    extraButtons: ['#periodoToggle', '#fechaRecibo'],
  },
  {
    path: '/comprobante-servicios',
    admin: true,
    buttons: ['.logout-btn', '#btnGenerar', '.nav-link'],
    run: exerciseReceiptPickers,
    extraButtons: ['#periodoToggle', '#fechaRecibo'],
  },
];

/** Elements that stick out of the viewport, to make an overflow failure easy to diagnose. */
function findOverflowingElements(page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    return [...document.body.querySelectorAll('*')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.right > limit + 1 && style.position !== 'fixed' && style.display !== 'none';
      })
      .slice(0, 8)
      .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${element.className}`);
  });
}

async function expectNoHorizontalOverflow(page) {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  const offenders = widths.document > widths.viewport + 1 ? await findOverflowingElements(page) : [];

  expect(widths.document, `page scrolls sideways (offenders: ${offenders.join(', ')})`).toBeLessThanOrEqual(
    widths.viewport + 1,
  );
  expect(widths.body, 'body wider than the viewport').toBeLessThanOrEqual(widths.viewport + 1);
}

/** The fixed header must leave room for the page: at most ~30% of the viewport height. */
async function expectCompactHeader(page, viewportHeight) {
  const height = await page.locator('header.header').evaluate((element) => element.getBoundingClientRect().height);
  expect(height / viewportHeight, `fixed header takes ${Math.round(height)}px of ${viewportHeight}px`).toBeLessThanOrEqual(
    MAX_HEADER_RATIO,
  );
}

/** Visible, inside the viewport, big enough and not covered by anything else. */
async function expectReachable(locator, label, minSize = MIN_TARGET_PX) {
  await expect(locator, `${label} is visible`).toBeVisible();
  const box = await locator.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      x: rect.x,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      viewport: document.documentElement.clientWidth,
      covered: !(hit === element || element.contains(hit)),
      coveredBy: hit ? `${hit.tagName.toLowerCase()}.${hit.className}` : 'nothing',
    };
  });

  expect(box.x, `${label} starts inside the screen`).toBeGreaterThanOrEqual(-1);
  expect(box.right, `${label} ends inside the screen`).toBeLessThanOrEqual(box.viewport + 1);
  expect(box.width, `${label} width`).toBeGreaterThanOrEqual(minSize);
  expect(box.height, `${label} height`).toBeGreaterThanOrEqual(minSize);
  expect(box.covered, `${label} is covered by ${box.coveredBy}`).toBe(false);
}

for (const viewport of VIEWPORTS) {
  test.describe(`mobile ${viewport.width}x${viewport.height} (${viewport.name})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    for (const pageDef of PAGES) {
      test(`${pageDef.path} has no horizontal overflow and reachable controls`, async ({ page, mock, signIn }) => {
        if (pageDef.admin) await signIn();
        pageDef.prepare?.(mock);

        await page.goto(pageDef.path);
        // React mounts after load: wait for the page's first control, then for fonts.
        // (`networkidle` is flaky here: the dev server keeps an HMR socket and images open.)
        await expect(page.locator(pageDef.buttons[0]).first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await pageDef.run?.(page);

        await expectNoHorizontalOverflow(page);
        await expectCompactHeader(page, viewport.height);

        for (const entry of [...pageDef.buttons, ...(pageDef.extraButtons ?? [])]) {
          const { selector, minSize } = typeof entry === 'string' ? { selector: entry } : entry;
          const matches = page.locator(selector);
          const count = await matches.count();
          expect(count, `"${selector}" exists`).toBeGreaterThan(0);
          for (let index = 0; index < count; index += 1) {
            await expectReachable(matches.nth(index), `${pageDef.path} ${selector}[${index}]`, minSize);
          }
        }
        // Scrolling around to reach the controls must not have introduced sideways scrolling.
        await expectNoHorizontalOverflow(page);
      });
    }
  });
}

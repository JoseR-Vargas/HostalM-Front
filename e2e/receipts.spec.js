import { readFileSync } from 'node:fs';
import { expect, test } from './support/fixtures.js';
import {
  calendar,
  clearDate,
  dateInput,
  openCalendar,
  openPeriod,
  periodDropdown,
  periodToggle,
  pickDate,
  pickMonth,
  pickersReady,
} from './support/receipt-pickers.js';

// PDF generation (html2canvas + jsPDF) is slow on a busy machine.
test.describe.configure({ timeout: 90_000 });

const CLIENT = '[TEST] Jennifer Martínez';
const PROPERTY = 'Humberto Primo 3070 Habitación 4';

const RECEIPTS = [
  {
    name: 'rent receipt (comprobante de pago)',
    path: '/comprobante-pago',
    idleLabel: '📄 Generar y Descargar PDF',
    amounts: { monto: '200.000,50' },
    invalidAmounts: { monto: '0' },
    amountGroups: ['monto'],
    filenamePrefix: 'Comprobante',
    filename: 'Comprobante_[TEST]_Jennifer_Martínez_Marzo.pdf',
    periodSelectors: ['#pdf-periodo'],
    template: {
      '#pdf-monto': '$200.000,50',
      '#pdf-total': '$200.000,50',
    },
  },
  {
    name: 'services receipt (comprobante de servicios)',
    path: '/comprobante-servicios',
    idleLabel: '📄 Generar Comprobante de Servicios',
    amounts: { montoAgua: '5.000', montoLuz: '8.000,50' },
    invalidAmounts: { montoAgua: '0', montoLuz: 'abc' },
    amountGroups: ['montoAgua', 'montoLuz'],
    filenamePrefix: 'Comprobante_Servicios',
    filename: 'Comprobante_Servicios_[TEST]_Jennifer_Martínez_Marzo.pdf',
    periodSelectors: ['#pdf-periodo', '#pdf-periodo-luz'],
    template: {
      '#pdf-monto-agua': '$5.000,00',
      '#pdf-monto-luz': '$8.000,50',
      '#pdf-periodo-luz': 'MARZO',
      '#pdf-total': '$13.000,50',
    },
  },
];

async function fillReceipt(page, receipt, { cliente = CLIENT, propiedad = PROPERTY, periodo = 'Marzo', amounts = receipt.amounts } = {}) {
  await page.locator('#cliente').fill(cliente);
  await page.locator('#propiedad').fill(propiedad);
  if (periodo) await pickMonth(page, periodo);
  for (const [field, value] of Object.entries(amounts)) {
    await page.locator(`#${field}`).fill(value);
  }
}

for (const receipt of RECEIPTS) {
  test.describe(receipt.name, () => {
    test.beforeEach(async ({ signIn }) => {
      await signIn();
    });

    test('renders the form with today as the default date', async ({ page }) => {
      await page.goto(receipt.path);
      await pickersReady(page);

      // The date is shown as DD/MM/YYYY; the form (and the sheet) keep working with the same day.
      await expect(dateInput(page)).toHaveValue('15/03/2026');
      await expect(page.locator('#pdf-fecha')).toHaveText('15/03/2026');
      await expect(page.locator('#periodo')).toHaveValue('');
      await expect(page.locator('#periodo option')).toHaveCount(13);
      await expect(periodToggle(page)).toHaveText('— Seleccioná el mes —');
      await expect(page.locator('#btnGenerar')).toHaveText(receipt.idleLabel);
    });

    test('the period select lists the twelve months and closes on Escape and on an outside click', async ({ page }) => {
      await page.goto(receipt.path);
      await openPeriod(page);

      await expect(periodDropdown(page).locator('[data-value]')).toHaveText([
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ]);
      await expect(periodToggle(page)).toHaveAttribute('aria-expanded', 'true');

      await page.keyboard.press('Escape');
      await expect(periodDropdown(page)).toHaveCount(0);
      await expect(periodToggle(page)).toHaveAttribute('aria-expanded', 'false');

      await openPeriod(page);
      await page.locator('h3.section-title').click();
      await expect(periodDropdown(page)).toHaveCount(0);
      // Nothing was picked by opening and closing.
      await expect(page.locator('#periodo')).toHaveValue('');
    });

    test('the period dropdown is not clipped by the form card', async ({ page }) => {
      await page.goto(receipt.path);
      await openPeriod(page);

      // The dropdown is outside the card (which has `overflow-hidden`) and every option it shows is on top.
      const hits = await page.evaluate(() => {
        const dropdown = document.querySelector('[data-hs-select-dropdown].opened');
        const card = document.querySelector('.contact-form');
        const visible = [...dropdown.querySelectorAll('[data-value]')].filter((option) => {
          const rect = option.getBoundingClientRect();
          const box = dropdown.getBoundingClientRect();
          return rect.top >= box.top && rect.bottom <= box.bottom && rect.bottom <= innerHeight && rect.top >= 0;
        });
        return {
          insideCard: card.contains(dropdown),
          visible: visible.length,
          onTop: visible.every((option) => {
            const rect = option.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return option === hit || option.contains(hit);
          }),
        };
      });
      expect(hits.insideCard).toBe(false);
      expect(hits.visible).toBeGreaterThan(3);
      expect(hits.onTop).toBe(true);
    });

    test('the calendar starts on Monday, in Spanish, on the selected day, and closes on Escape and outside click', async ({
      page,
    }) => {
      await page.goto(receipt.path);
      await openCalendar(page);

      const popup = calendar(page);
      await expect(popup.locator('[data-vc="week"] > *')).toHaveText(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
      await expect(popup.locator('[data-vc="month"]')).toHaveText('Marzo');
      await expect(popup.locator('[data-vc="year"]')).toHaveText('2026');
      await expect(popup.locator('[data-vc-date-selected]')).toHaveAttribute('data-vc-date', '2026-03-15');

      await page.keyboard.press('Escape');
      await expect(calendar(page)).toHaveCount(0);

      await openCalendar(page);
      await page.locator('h3.section-title').click();
      await expect(calendar(page)).toHaveCount(0);
      await expect(dateInput(page)).toHaveValue('15/03/2026');
    });

    test('a picked past date and month go to the sheet and the filename', async ({ page }) => {
      await page.goto(receipt.path);
      await fillReceipt(page, receipt, { periodo: 'Octubre' });
      const iso = await pickDate(page, { year: 2025, month: 10, day: 19 });
      expect(iso).toBe('2025-10-19');
      await expect(dateInput(page)).toHaveValue('19/10/2025');

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        page.locator('#btnGenerar').click(),
      ]);

      expect(download.suggestedFilename()).toBe(`${receipt.filenamePrefix}_[TEST]_Jennifer_Martínez_Octubre.pdf`);
      expect(await download.failure()).toBeNull();
      await expect(page.locator('#pdf-fecha')).toHaveText('19/10/2025');
      for (const selector of receipt.periodSelectors) {
        await expect(page.locator(selector)).toHaveText('OCTUBRE');
      }
      await expect(page.locator('#group-periodo')).not.toHaveClass(/error/);
      await expect(page.locator('#group-fecha')).not.toHaveClass(/error/);
    });

    test('generates and downloads a PDF with the expected filename', async ({ page }) => {
      await page.goto(receipt.path);
      await fillReceipt(page, receipt);

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60_000 }),
        page.locator('#btnGenerar').click(),
      ]);

      expect(download.suggestedFilename()).toBe(receipt.filename);
      expect(await download.failure()).toBeNull();

      const pdf = readFileSync(await download.path());
      expect(pdf.length).toBeGreaterThan(1000);
      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(pdf.subarray(-32).toString('latin1')).toContain('%%EOF');

      // The button is back to normal and the sheet's data was filled in.
      await expect(page.locator('#btnGenerar')).toHaveText(receipt.idleLabel);
      await expect(page.locator('#btnGenerar')).not.toHaveClass(/processing/);
      await expect(page.locator('#pdf-fecha')).toHaveText('15/03/2026');
      await expect(page.locator('#pdf-cliente')).toHaveText(CLIENT.toUpperCase());
      await expect(page.locator('#pdf-propiedad')).toHaveText(PROPERTY.toUpperCase());
      await expect(page.locator('#pdf-periodo')).toHaveText('MARZO');
      for (const [selector, text] of Object.entries(receipt.template)) {
        await expect(page.locator(selector)).toHaveText(text);
      }
      // The sheet is hidden again after capturing.
      await expect(page.locator('#pdfTemplate')).toBeHidden();
    });

    test('an empty form flags every field and downloads nothing', async ({ page }) => {
      let downloads = 0;
      page.on('download', () => {
        downloads += 1;
      });
      await page.goto(receipt.path);
      await clearDate(page, '2026-03-15');
      await page.locator('#btnGenerar').click();

      for (const group of ['cliente', 'propiedad', 'periodo', 'fecha', ...receipt.amountGroups]) {
        await expect(page.locator(`#group-${group}`)).toHaveClass(/error/);
        await expect(page.locator(`#group-${group} .error-message`)).toBeVisible();
      }
      await page.waitForTimeout(500);
      expect(downloads).toBe(0);
      await expect(page.locator('#btnGenerar')).toHaveText(receipt.idleLabel);
    });

    test('non-positive or non-numeric amounts are rejected', async ({ page }) => {
      let downloads = 0;
      page.on('download', () => {
        downloads += 1;
      });
      await page.goto(receipt.path);
      await fillReceipt(page, receipt, { amounts: receipt.invalidAmounts });
      await page.locator('#btnGenerar').click();

      for (const group of receipt.amountGroups) {
        await expect(page.locator(`#group-${group}`)).toHaveClass(/error/);
      }
      await expect(page.locator('#group-cliente')).not.toHaveClass(/error/);
      await expect(page.locator('#group-periodo')).not.toHaveClass(/error/);
      await page.waitForTimeout(500);
      expect(downloads).toBe(0);
    });

    test('only the missing field is flagged', async ({ page }) => {
      await page.goto(receipt.path);
      await fillReceipt(page, receipt, { cliente: '   ', periodo: null });
      await page.locator('#btnGenerar').click();

      await expect(page.locator('#group-cliente')).toHaveClass(/error/);
      await expect(page.locator('#group-periodo')).toHaveClass(/error/);
      await expect(page.locator('#group-fecha')).not.toHaveClass(/error/);
      await expect(page.locator('#group-propiedad')).not.toHaveClass(/error/);
      for (const group of receipt.amountGroups) {
        await expect(page.locator(`#group-${group}`)).not.toHaveClass(/error/);
      }

      // Picking the month clears nothing by itself: the error goes away on the next attempt.
      await pickMonth(page, 'Marzo');
      await page.locator('#btnGenerar').click();
      await expect(page.locator('#group-periodo')).not.toHaveClass(/error/);
      await expect(page.locator('#group-cliente')).toHaveClass(/error/);
    });

    test('amount fields get thousands separators while typing', async ({ page }) => {
      await page.goto(receipt.path);
      const field = page.locator(`#${receipt.amountGroups[0]}`);

      await field.fill('1234567,5');
      await expect(field).toHaveValue('1.234.567,5');

      await field.fill('a1b2c3');
      await expect(field).toHaveValue('123');
    });
  });
}

import { readFileSync } from 'node:fs';
import { expect, test } from './support/fixtures.js';

// PDF generation (html2canvas + jsPDF) is slow on a busy machine.
test.describe.configure({ timeout: 90_000 });

const CLIENT = '[TEST] Jennifer Martínez';
const PROPERTY = 'Humberto Primo 3070 Habitación 4';

const RECEIPTS = [
  {
    name: 'rent receipt (comprobante de pago)',
    path: '/comprobante-pago.html',
    idleLabel: '📄 Generar y Descargar PDF',
    amounts: { monto: '200.000,50' },
    invalidAmounts: { monto: '0' },
    amountGroups: ['monto'],
    filename: 'Comprobante_[TEST]_Jennifer_Martínez_Marzo.pdf',
    template: {
      '#pdf-monto': '$200.000,50',
      '#pdf-total': '$200.000,50',
    },
  },
  {
    name: 'services receipt (comprobante de servicios)',
    path: '/comprobante-servicios.html',
    idleLabel: '📄 Generar Comprobante de Servicios',
    amounts: { montoAgua: '5.000', montoLuz: '8.000,50' },
    invalidAmounts: { montoAgua: '0', montoLuz: 'abc' },
    amountGroups: ['montoAgua', 'montoLuz'],
    filename: 'Comprobante_Servicios_[TEST]_Jennifer_Martínez_Marzo.pdf',
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
  if (periodo) await page.locator('#periodo').selectOption(periodo);
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

      await expect(page.locator('#fechaRecibo')).toHaveValue('2026-03-15');
      await expect(page.locator('#periodo')).toHaveValue('');
      await expect(page.locator('#periodo option')).toHaveCount(13);
      await expect(page.locator('#btnGenerar')).toHaveText(receipt.idleLabel);
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
      await page.locator('#fechaRecibo').fill('');
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
      await expect(page.locator('#group-propiedad')).not.toHaveClass(/error/);
      for (const group of receipt.amountGroups) {
        await expect(page.locator(`#group-${group}`)).not.toHaveClass(/error/);
      }
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { downloadPdf } from '../lib/pdf';
import { getDefaultReceiptDate } from '../lib/receipts';
import ComprobanteServicios from './ComprobanteServicios';

vi.mock('../lib/pdf', () => ({ downloadPdf: vi.fn() }));
// The Preline plugins never finish loading here, so the form is driven through the native controls the period and date
// fields fall back to (the fields and their plugins have their own tests; `e2e/receipts.spec.js` covers the real ones).
vi.mock('@preline/select/non-auto.mjs', () => new Promise(() => {}));
vi.mock('@preline/datepicker/non-auto.mjs', () => new Promise(() => {}));

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <ComprobanteServicios />
      </MemoryRouter>
    </AuthProvider>,
  );

const type = (container, id, value) => fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
const fill = (container, overrides = {}) => {
  const values = {
    cliente: 'Jennifer Martínez',
    propiedad: 'Humberto Primo 3070 Habitación 4',
    periodo: 'Octubre',
    fechaRecibo: '2026-10-19',
    montoAgua: '5.000',
    montoLuz: '8.000,50',
    ...overrides,
  };
  for (const [id, value] of Object.entries(values)) type(container, id, value);
};
const generate = (container) => fireEvent.click(container.querySelector('#btnGenerar'));
const text = (container, id) => container.querySelector(`#${id}`).textContent;
const erroredGroups = (container) => [...container.querySelectorAll('.form-group.error')].map((g) => g.id);

beforeEach(() => {
  sessionStorage.setItem('mayelewoo_admin_token', 'abc');
  downloadPdf.mockReset();
  downloadPdf.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('ComprobanteServicios', () => {
  it('renders the form with today as the default date', () => {
    const { container, getByText } = renderPage();
    expect(getByText('Comprobante de Servicios', { selector: 'h3.section-title' })).toBeTruthy();
    expect(getByText('Completá los datos y descargá el PDF del comprobante')).toBeTruthy();
    expect(container.querySelector('#fechaRecibo').value).toBe(getDefaultReceiptDate());
    expect(container.querySelector('label[for="montoAgua"]').textContent).toBe('Monto Agua ($)');
    expect(container.querySelector('label[for="montoLuz"]').textContent).toBe('Monto Luz ($)');
    expect(container.querySelector('#btnGenerar').textContent).toBe('📄 Generar Comprobante de Servicios');
    expect([...container.querySelectorAll('nav.nav-menu a')].map((a) => a.textContent)).toEqual([
      '📋 Vouchers',
      '🧮 Medidor',
      '📄 Alquiler',
    ]);
  });

  it('renders the PAGADO stamp inside the hidden A4 template', () => {
    const { container } = renderPage();
    const wrapper = container.querySelector('#pdfTemplate');
    expect(wrapper.style.display).toBe('none');
    expect(wrapper.textContent).toContain('PAGADO');
    expect(wrapper.textContent).toContain('COMPROBANTE DE SERVICIOS');
    expect(wrapper.textContent).toContain('Agua:');
    expect(wrapper.textContent).toContain('Luz Eléctrica:');
  });

  it('adds thousands dots to both amounts while typing', () => {
    const { container } = renderPage();
    type(container, 'montoAgua', '5000');
    type(container, 'montoLuz', '8000,5');
    expect(container.querySelector('#montoAgua').value).toBe('5.000');
    expect(container.querySelector('#montoLuz').value).toBe('8.000,5');
  });

  it('shows the form values and the water + light total in the template', () => {
    const { container } = renderPage();
    fill(container);
    expect(text(container, 'pdf-fecha')).toBe('19/10/2026');
    expect(text(container, 'pdf-cliente')).toBe('JENNIFER MARTÍNEZ');
    expect(text(container, 'pdf-propiedad')).toBe('HUMBERTO PRIMO 3070 HABITACIÓN 4');
    expect(text(container, 'pdf-periodo')).toBe('OCTUBRE');
    expect(text(container, 'pdf-periodo-luz')).toBe('OCTUBRE');
    expect(text(container, 'pdf-monto-agua')).toBe('$5.000,00');
    expect(text(container, 'pdf-monto-luz')).toBe('$8.000,50');
    expect(text(container, 'pdf-total')).toBe('$13.000,50');
  });

  it('flags every invalid field and does not generate', () => {
    const { container } = renderPage();
    type(container, 'fechaRecibo', '');
    generate(container);
    expect(erroredGroups(container)).toEqual([
      'group-cliente',
      'group-propiedad',
      'group-periodo',
      'group-fecha',
      'group-montoAgua',
      'group-montoLuz',
    ]);
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it('flags only the amount that is not valid', () => {
    const { container } = renderPage();
    fill(container, { montoLuz: '0' });
    generate(container);
    expect(erroredGroups(container)).toEqual(['group-montoLuz']);
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it('downloads the PDF with the services file name and clears previous errors', async () => {
    const { container } = renderPage();
    generate(container);
    expect(erroredGroups(container)).toHaveLength(5);

    fill(container);
    generate(container);
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(1));
    expect(downloadPdf).toHaveBeenCalledWith(
      container.querySelector('#pdfTemplate'),
      'Comprobante_Servicios_Jennifer_Martínez_Octubre.pdf',
    );
    expect(erroredGroups(container)).toEqual([]);
  });

  it('shows the processing state while the PDF is being built', async () => {
    let finish;
    downloadPdf.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { container } = renderPage();
    fill(container);

    generate(container);
    const button = container.querySelector('#btnGenerar');
    await waitFor(() => expect(button.textContent).toBe('📄 Generando PDF...'));
    expect(button.classList.contains('processing')).toBe(true);

    await act(async () => finish());
    expect(button.textContent).toBe('📄 Generar Comprobante de Servicios');
    expect(button.classList.contains('processing')).toBe(false);
  });

  it('alerts and recovers when the PDF generation fails', async () => {
    downloadPdf.mockRejectedValue(new Error('canvas failed'));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderPage();
    fill(container);

    generate(container);
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error al generar el PDF. Intentá de nuevo.'));
    await waitFor(() =>
      expect(container.querySelector('#btnGenerar').textContent).toBe('📄 Generar Comprobante de Servicios'),
    );
  });
});

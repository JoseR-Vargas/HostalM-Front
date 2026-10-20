import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { downloadPdf } from '../lib/pdf';
import { getDefaultReceiptDate } from '../lib/receipts';
import ComprobantePago from './ComprobantePago';

vi.mock('../lib/pdf', () => ({ downloadPdf: vi.fn() }));

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <ComprobantePago />
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
    monto: '200.000,50',
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

describe('ComprobantePago', () => {
  it('renders the form with today as the default date', () => {
    const { container, getByText } = renderPage();
    expect(getByText('Comprobante de Pago', { selector: 'h3.section-title' })).toBeTruthy();
    expect(getByText('Completá los datos y descargá el PDF del comprobante')).toBeTruthy();
    expect(getByText('Datos del comprobante')).toBeTruthy();
    expect([...container.querySelectorAll('#periodo option')]).toHaveLength(13);
    expect(container.querySelector('#fechaRecibo').value).toBe(getDefaultReceiptDate());
    expect(container.querySelector('#btnGenerar').textContent).toBe('📄 Generar y Descargar PDF');
    expect([...container.querySelectorAll('nav.nav-menu a')].map((a) => a.textContent)).toEqual([
      '📋 Vouchers',
      '🧮 Medidor',
    ]);
    expect(container.querySelector('footer')).toBeTruthy();
  });

  it('renders the PAGADO stamp inside the hidden A4 template', () => {
    const { container } = renderPage();
    const wrapper = container.querySelector('#pdfTemplate');
    expect(wrapper.style.display).toBe('none');
    expect(wrapper.firstElementChild.style.width).toBe('210mm');
    expect(wrapper.textContent).toContain('PAGADO');
    expect(wrapper.textContent).toContain('COMPROBANTE DE PAGO');
    expect(wrapper.textContent).toContain('Alquiler:');
  });

  it('adds thousands dots to the amount while typing', () => {
    const { container } = renderPage();
    type(container, 'monto', '200000,50');
    expect(container.querySelector('#monto').value).toBe('200.000,50');
  });

  it('shows the form values in the template', () => {
    const { container } = renderPage();
    fill(container);
    expect(text(container, 'pdf-fecha')).toBe('19/10/2026');
    expect(text(container, 'pdf-cliente')).toBe('JENNIFER MARTÍNEZ');
    expect(text(container, 'pdf-propiedad')).toBe('HUMBERTO PRIMO 3070 HABITACIÓN 4');
    expect(text(container, 'pdf-periodo')).toBe('OCTUBRE');
    expect(text(container, 'pdf-monto')).toBe('$200.000,50');
    expect(text(container, 'pdf-total')).toBe('$200.000,50');
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
      'group-monto',
    ]);
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it('rejects a zero amount', () => {
    const { container } = renderPage();
    fill(container, { monto: '0' });
    generate(container);
    expect(erroredGroups(container)).toEqual(['group-monto']);
    expect(downloadPdf).not.toHaveBeenCalled();
  });

  it('downloads the PDF with the expected file name and clears previous errors', async () => {
    const { container } = renderPage();
    generate(container);
    expect(erroredGroups(container)).toHaveLength(4);

    fill(container);
    generate(container);
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledTimes(1));
    expect(downloadPdf).toHaveBeenCalledWith(
      container.querySelector('#pdfTemplate'),
      'Comprobante_Jennifer_Martínez_Octubre.pdf',
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
    await waitFor(() => expect(button.textContent).toBe('Generando PDF...'));
    expect(button.classList.contains('processing')).toBe(true);

    // A second click while processing does not start another PDF.
    generate(container);
    expect(downloadPdf).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(button.textContent).toBe('📄 Generar y Descargar PDF');
    expect(button.classList.contains('processing')).toBe(false);
  });

  it('alerts and recovers when the PDF generation fails', async () => {
    downloadPdf.mockRejectedValue(new Error('canvas failed'));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderPage();
    fill(container);

    generate(container);
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error al generar el PDF. Intentá de nuevo.'));
    expect(consoleError).toHaveBeenCalled();
    await waitFor(() => expect(container.querySelector('#btnGenerar').textContent).toBe('📄 Generar y Descargar PDF'));
  });
});

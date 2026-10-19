import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import DashboardCalculator from './DashboardCalculator';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date();
const thisMonth = now.toISOString();
const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12).toISOString();

const calculo = (overrides = {}) => ({
  _id: 'id1',
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  habitacion: '101',
  medicionAnterior: 100,
  medicionActual: 110.5,
  consumoCalculado: 10.5,
  montoTotal: 4634.1,
  fechaRegistro: thisMonth,
  fotoAnteriorData: { filename: 'a.jpg' },
  fotoActualData: { filename: 'b.jpg' },
  ...overrides,
});

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <DashboardCalculator />
      </MemoryRouter>
    </AuthProvider>,
  );

const mockCalculos = (data) => {
  const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
const overlay = (container) => container.querySelector('#loadingOverlay');
const rows = (container) => [...container.querySelectorAll('#calculatorTableBody tr')];
const cells = (row) => [...row.querySelectorAll('td')].map((td) => td.textContent);
const metrics = (container) => [...container.querySelectorAll('#metricsCalculator .metric-card')].map((card) => [
  card.querySelector('.metric-title').textContent,
  card.querySelector('.metric-value').textContent,
]);
const loaded = (container) => waitFor(() => expect(overlay(container).style.display).toBe('none'));

beforeEach(() => {
  sessionStorage.setItem('mayelewoo_admin_token', 'abc');
  window.alert = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DashboardCalculator', () => {
  it('renders the admin header, titles, pager and table headers', async () => {
    mockCalculos([]);
    const { container, getByText } = renderPage();

    const links = [...container.querySelectorAll('nav.nav-menu a.nav-link')].map((a) => a.textContent);
    expect(links).toEqual(['📋 Vouchers', '📄 Comprobante', '💧 Servicios', '⚡ Calcular Pago']);
    expect(getByText('Calculadora de Medidor')).toBeTruthy();
    expect(getByText('Gestión de cálculos de consumo eléctrico')).toBeTruthy();
    expect(getByText('Registro de cálculos')).toBeTruthy();
    expect([...container.querySelectorAll('#calculatorTable th')].map((th) => th.textContent)).toEqual([
      'Nombre',
      'Apellido',
      'DNI',
      'Habitación',
      'Medición Ant.',
      'Medición Act.',
      'Consumo (kWh)',
      'Fecha',
      'Fotos',
    ]);
    expect(container.querySelector('#imageModal').classList.contains('show')).toBe(false);
    await loaded(container);
  });

  it('shows the loading overlay until the data arrives and sends the Bearer token', async () => {
    const fetchMock = mockCalculos([calculo()]);
    const { container } = renderPage();
    expect(overlay(container).style.display).toBe('flex');

    await loaded(container);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/calculos-medidor$/);
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  it('renders the metrics and the rows of the current month', async () => {
    mockCalculos([
      calculo(),
      calculo({ _id: 'id2', habitacion: '102', consumoCalculado: 20 }),
      calculo({ _id: 'old', habitacion: '999', fechaRegistro: previousMonth }),
    ]);
    const { container } = renderPage();
    await loaded(container);

    expect(metrics(container)).toEqual([
      ['Total Registros', '2'],
      ['Consumo Total', '30.5 kWh'],
      ['Promedio Consumo', '15.3 kWh'],
    ]);
    expect(rows(container)).toHaveLength(2);
    expect(cells(rows(container)[0]).slice(0, 8)).toEqual([
      'Ana',
      'Pérez',
      '30111222',
      '101',
      '100.0',
      '110.5',
      '10.5',
      now.toLocaleDateString('es-AR'),
    ]);
    expect(rows(container)[0].querySelectorAll('td')[6].className).toBe('consumo-cell');
  });

  it('shows the empty state instead of the table when the month has no records', async () => {
    mockCalculos([calculo({ fechaRegistro: previousMonth })]);
    const { container, getByText } = renderPage();
    await loaded(container);

    expect(getByText('No hay registros de cálculos disponibles')).toBeTruthy();
    expect(container.querySelector('.table-container')).toBeNull();
    expect(metrics(container)[0]).toEqual(['Total Registros', '0']);
    expect(metrics(container)[2]).toEqual(['Promedio Consumo', '0 kWh']);
  });

  it('shows records without a usable date in every month', async () => {
    mockCalculos([calculo({ fechaRegistro: undefined })]);
    const { container } = renderPage();
    await loaded(container);
    expect(rows(container)).toHaveLength(1);
    expect(cells(rows(container)[0])[7]).toBe('—');

    fireEvent.click(container.querySelector('#prevMonth'));
    expect(rows(container)).toHaveLength(1);
  });

  it('pages through the months with a capitalized label', async () => {
    mockCalculos([calculo(), calculo({ _id: 'old', habitacion: '999', fechaRegistro: previousMonth })]);
    const { container } = renderPage();
    await loaded(container);
    const current = container.querySelector('#currentMonthLabel').textContent;
    expect(current.charAt(0)).toBe(current.charAt(0).toUpperCase());

    fireEvent.click(container.querySelector('#prevMonth'));
    expect(container.querySelector('#currentMonthLabel').textContent).not.toBe(current);
    expect(cells(rows(container)[0])[3]).toBe('999');

    fireEvent.click(container.querySelector('#nextMonth'));
    expect(container.querySelector('#currentMonthLabel').textContent).toBe(current);
    expect(cells(rows(container)[0])[3]).toBe('101');
  });

  it('renders photo thumbnails pointing at the photo endpoints and placeholders when there is no photo', async () => {
    mockCalculos([calculo(), calculo({ _id: 'id2', habitacion: '102', fotoAnteriorData: null, fotoActualData: {} })]);
    const { container } = renderPage();
    await loaded(container);

    const first = rows(container)[0].querySelectorAll('img.foto-medidor-preview');
    expect([...first].map((img) => img.getAttribute('src'))).toEqual([
      'http://localhost:3000/api/calculos-medidor/id1/foto-anterior',
      'http://localhost:3000/api/calculos-medidor/id1/foto-actual',
    ]);
    expect([...first].map((img) => img.getAttribute('alt'))).toEqual(['Medición Anterior', 'Medición Actual']);

    const second = rows(container)[1];
    expect(second.querySelector('img')).toBeNull();
    expect([...second.querySelectorAll('.sin-foto')].map((s) => s.textContent)).toEqual([
      'Sin foto ant.',
      'Sin foto act.',
    ]);
  });

  it('marks a photo that fails to load', async () => {
    mockCalculos([calculo()]);
    const { container } = renderPage();
    await loaded(container);

    const img = rows(container)[0].querySelector('img');
    fireEvent.error(img);
    expect(img.classList.contains('imagen-error')).toBe(true);
    expect(img.getAttribute('alt')).toBe('Error al cargar');
  });

  it('opens the photo modal and closes it with X, backdrop or Escape', async () => {
    mockCalculos([calculo()]);
    const { container } = renderPage();
    await loaded(container);
    const modal = container.querySelector('#imageModal');
    const open = () => fireEvent.click(rows(container)[0].querySelectorAll('img')[1]);

    open();
    expect(modal.classList.contains('show')).toBe(true);
    expect(container.querySelector('#imageModalTitle').textContent).toBe('Medición Actual - 101');
    expect(container.querySelector('#modalImage').getAttribute('src')).toBe(
      'http://localhost:3000/api/calculos-medidor/id1/foto-actual',
    );

    fireEvent.click(container.querySelector('#modalImage'));
    expect(modal.classList.contains('show')).toBe(true);

    fireEvent.click(container.querySelector('.close-modal'));
    expect(modal.classList.contains('show')).toBe(false);

    open();
    fireEvent.click(modal);
    expect(modal.classList.contains('show')).toBe(false);

    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(modal.classList.contains('show')).toBe(false);

    // Escape is only listened to while the modal is open
    open();
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(modal.classList.contains('show')).toBe(true);
  });

  it('opens the anterior photo with its own title', async () => {
    mockCalculos([calculo()]);
    const { container } = renderPage();
    await loaded(container);
    fireEvent.click(rows(container)[0].querySelectorAll('img')[0]);
    expect(container.querySelector('#imageModalTitle').textContent).toBe('Medición Anterior - 101');
  });

  it('renders user data as text, never as markup', async () => {
    const evil = `<img src=x onerror=alert(1)>'`;
    mockCalculos([calculo({ nombre: evil, habitacion: evil })]);
    const { container } = renderPage();
    await loaded(container);

    expect(cells(rows(container)[0])[0]).toBe(evil);
    expect(rows(container)[0].querySelectorAll('img')).toHaveLength(2);
    fireEvent.click(rows(container)[0].querySelectorAll('img')[0]);
    expect(container.querySelector('#imageModalTitle').textContent).toBe(`Medición Anterior - ${evil}`);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('alerts and hides the overlay when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));
    const { container } = renderPage();
    await loaded(container);
    expect(window.alert).toHaveBeenCalledWith('Error al cargar los datos. Por favor, intente nuevamente.');
    expect(rows(container)).toHaveLength(0);
  });
});

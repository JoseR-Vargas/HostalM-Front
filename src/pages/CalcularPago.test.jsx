import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import CalcularPago from './CalcularPago';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date();
const thisMonth = (day = 10) => new Date(now.getFullYear(), now.getMonth(), day, 12).toISOString();
const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12).toISOString();

const record = (habitacion, overrides = {}) => ({
  _id: `${habitacion}-${overrides.fechaRegistro}`,
  nombre: 'Nombre',
  apellido: habitacion,
  habitacion,
  consumoCalculado: 10,
  fechaRegistro: thisMonth(),
  ...overrides,
});

const RECORDS = [
  record('B2', { nombre: 'Viejo', consumoCalculado: 5, fechaRegistro: thisMonth(5) }),
  record('B2', { nombre: 'Beto', consumoCalculado: 100, fechaRegistro: thisMonth(20) }),
  record('A1', { nombre: 'Ana', consumoCalculado: 50.5, fechaRegistro: thisMonth(8) }),
  record('C3', { nombre: 'Carla', consumoCalculado: 7, fechaRegistro: previousMonth }),
];

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <CalcularPago />
      </MemoryRouter>
    </AuthProvider>,
  );

const mockRecords = (data = RECORDS) => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({ success: true, data })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
const type = (container, id, value) => fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
const calculate = (container, monto = '200.000', kwh = '450') => {
  type(container, 'montoFactura', monto);
  type(container, 'totalKwhFactura', kwh);
  fireEvent.click(container.querySelector('#btnCalcularPrecio'));
};
const rows = (container) => [...container.querySelectorAll('#residentesTableBody tr')];
const cells = (row) => [...row.querySelectorAll('td')].map((td) => td.textContent);
const loadedRows = async (container) => waitFor(() => expect(rows(container).length).toBeGreaterThan(0));
const select = (container, index) => fireEvent.click(rows(container)[index].querySelector('button'));
const fieldError = (container, id) => {
  const group = container.querySelector(`#${id}`).closest('.form-group');
  return {
    active: group.classList.contains('error'),
    message: group.querySelector('.error-message').textContent,
  };
};

beforeEach(() => {
  sessionStorage.setItem('mayelewoo_admin_token', 'abc');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CalcularPago step 1', () => {
  it('renders the admin header, the invoice form and hides step 2', () => {
    const { container, getByText } = renderPage();

    const links = [...container.querySelectorAll('nav.nav-menu a.nav-link')].map((a) => a.textContent);
    expect(links).toEqual(['📋 Vouchers', '🧮 Medidor', '📄 Comprobante']);
    expect(getByText('Calculadora de Pago de Electricidad')).toBeTruthy();
    expect(getByText('Paso 1 — Datos de la factura')).toBeTruthy();
    expect(container.querySelector('#precioKwh').readOnly).toBe(true);
    expect(container.querySelector('#precioKwh').getAttribute('placeholder')).toBe('—');
    expect(container.querySelector('#btnCalcularPrecio').textContent.trim()).toBe('Calcular Precio kWh');
    expect(container.querySelector('#step2Section')).toBeNull();
    expect(container.querySelector('footer')).toBeTruthy();
  });

  it('formats the invoice amount with thousands dots while typing', () => {
    const { container } = renderPage();
    type(container, 'montoFactura', '200000,50');
    expect(container.querySelector('#montoFactura').value).toBe('200.000,50');
    type(container, 'montoFactura', '1a2b3');
    expect(container.querySelector('#montoFactura').value).toBe('123');
  });

  it('keeps the caret where the user is typing when the mask rewrites the value', async () => {
    const { container } = renderPage();
    const input = container.querySelector('#montoFactura');
    type(container, 'montoFactura', '1.000');
    input.focus();

    // the user deletes the dot: raw "1000" with the caret after the "1"
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '1000');
    input.setSelectionRange(1, 1);
    fireEvent.input(input);
    await Promise.resolve();

    expect(input.value).toBe('1.000');
    expect(input.selectionStart).toBe(1);
  });

  it('moves the caret past a new thousands dot when the value grows', async () => {
    const { container } = renderPage();
    const input = container.querySelector('#montoFactura');
    type(container, 'montoFactura', '999');
    input.focus();

    // the user types a "9" at the end: raw "9999", caret at 4 -> "9.999" with the caret at 5
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '9999');
    input.setSelectionRange(4, 4);
    fireEvent.input(input);
    await Promise.resolve();

    expect(input.value).toBe('9.999');
    expect(input.selectionStart).toBe(5);
  });

  it('keeps only digits and one decimal separator in the kWh field', () => {
    const { container } = renderPage();
    type(container, 'totalKwhFactura', '4a5.0,5');
    expect(container.querySelector('#totalKwhFactura').value).toBe('45.05');
  });

  it('flags invalid fields, sends nothing and keeps step 2 hidden', () => {
    const fetchMock = mockRecords();
    const { container } = renderPage();
    fireEvent.click(container.querySelector('#btnCalcularPrecio'));

    expect(fieldError(container, 'montoFactura')).toEqual({
      active: true,
      message: 'Ingresá un monto válido mayor a cero',
    });
    expect(fieldError(container, 'totalKwhFactura')).toEqual({
      active: true,
      message: 'Ingresá los kWh totales de la factura (mayor a cero)',
    });
    expect(container.querySelector('#precioKwh').value).toBe('');
    expect(container.querySelector('#step2Section')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects zero values and flags only the failing field', () => {
    const { container } = renderPage();
    calculate(container, '200.000', '0');
    expect(fieldError(container, 'montoFactura').active).toBe(false);
    expect(fieldError(container, 'totalKwhFactura').active).toBe(true);
  });

  it('clears the errors on the next valid calculation', async () => {
    mockRecords();
    const { container } = renderPage();
    fireEvent.click(container.querySelector('#btnCalcularPrecio'));
    calculate(container);
    expect(fieldError(container, 'montoFactura').active).toBe(false);
    expect(fieldError(container, 'totalKwhFactura').active).toBe(false);
    await loadedRows(container);
  });
});

describe('CalcularPago step 2', () => {
  it('calculates the price per kWh (argentine format) and lists the latest record per room sorted', async () => {
    const fetchMock = mockRecords();
    const { container, getByText } = renderPage();
    calculate(container);

    expect(container.querySelector('#precioKwh').value).toBe('444,44');
    expect(getByText('Paso 2 — Residentes del mes')).toBeTruthy();
    expect(getByText('Cargando residentes...')).toBeTruthy();

    await loadedRows(container);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/calculos-medidor$/);
    expect(init.headers.Authorization).toBe('Bearer abc');

    expect(rows(container).map((row) => cells(row).slice(0, 4))).toEqual([
      ['Ana', 'A1', 'A1', '50.5 kWh'],
      ['Beto', 'B2', 'B2', '100.0 kWh'],
    ]);
    expect(rows(container)[0].id).toBe('fila-A1');
    const label = container.querySelector('#residentesMonthLabel').textContent;
    expect(label).toBe(label.charAt(0).toUpperCase() + label.slice(1));
    expect(label).toContain(String(now.getFullYear()));
    expect(container.querySelector('#residenteSeleccionado')).toBeNull();
  });

  it('selecting a resident shows the total (consumo x precio) and highlights the row', async () => {
    mockRecords();
    const { container } = renderPage();
    calculate(container);
    await loadedRows(container);

    select(container, 1);

    expect(container.querySelector('#residenteNombreDisplay').textContent).toBe('Beto B2');
    expect(container.querySelector('#residenteHabitacionDisplay').textContent).toBe('Habitación: B2');
    expect(container.querySelector('#residenteConsumoDisplay').textContent).toBe('100.0 kWh');
    expect(container.querySelector('#residentePrecioKwhDisplay').textContent).toBe('$444,44');
    // 100 kWh x (200000 / 450) = 44444.44...
    expect(container.querySelector('#residenteTotalDisplay').textContent).toBe('$44.444,44');
    expect(container.querySelector('#residenteTotalDisplay').className).toBe('result-amount');
    expect(rows(container)[1].style.backgroundColor).not.toBe('');
    expect(rows(container)[1].style.borderLeft).toContain('3px solid');
    expect(rows(container)[0].style.backgroundColor).toBe('');

    select(container, 0);
    expect(container.querySelector('#residenteTotalDisplay').textContent).toBe('$22.444,44');
    expect(rows(container)[1].style.backgroundColor).toBe('');
  });

  it('changing the month filters the residents without a new request and clears the selection', async () => {
    const fetchMock = mockRecords();
    const { container, getByText } = renderPage();
    calculate(container);
    await loadedRows(container);
    select(container, 0);
    const current = container.querySelector('#residentesMonthLabel').textContent;

    fireEvent.click(container.querySelector('#btnMesAnterior'));
    expect(container.querySelector('#residentesMonthLabel').textContent).not.toBe(current);
    expect(rows(container).map((row) => cells(row)[2])).toEqual(['C3']);
    expect(container.querySelector('#residenteSeleccionado')).toBeNull();

    fireEvent.click(container.querySelector('#btnMesAnterior'));
    expect(rows(container)).toHaveLength(0);
    expect(getByText('No hay registros de consumo para este mes.')).toBeTruthy();

    fireEvent.click(container.querySelector('#btnMesSiguiente'));
    fireEvent.click(container.querySelector('#btnMesSiguiente'));
    expect(container.querySelector('#residentesMonthLabel').textContent).toBe(current);
    expect(rows(container)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('recalculating refetches and resets the selected resident with the new price', async () => {
    const fetchMock = mockRecords();
    const { container } = renderPage();
    calculate(container);
    await loadedRows(container);
    select(container, 0);

    calculate(container, '100.000', '500');
    expect(container.querySelector('#precioKwh').value).toBe('200,00');
    expect(container.querySelector('#residenteSeleccionado')).toBeNull();
    await loadedRows(container);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    select(container, 0);
    expect(container.querySelector('#residenteTotalDisplay').textContent).toBe('$10.100,00');
  });

  it('an invalid recalculation clears the price and the selection', async () => {
    mockRecords();
    const { container } = renderPage();
    calculate(container);
    await loadedRows(container);
    select(container, 0);

    type(container, 'totalKwhFactura', '');
    fireEvent.click(container.querySelector('#btnCalcularPrecio'));

    expect(container.querySelector('#precioKwh').value).toBe('');
    expect(container.querySelector('#residenteSeleccionado')).toBeNull();
    // the price is gone: selecting a row does nothing
    select(container, 1);
    expect(container.querySelector('#residenteSeleccionado')).toBeNull();
  });

  it('shows a connection error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));
    const { container } = renderPage();
    calculate(container);

    await waitFor(() => expect(container.querySelector('#residentesErrorMsg')).not.toBeNull());
    expect(container.querySelector('#residentesErrorMsg').textContent).toBe(
      'No se pudo cargar la lista de residentes. Verificá tu conexión e intentá de nuevo.',
    );
    expect(container.querySelector('#residentesTableContainer')).toBeNull();
    expect(container.querySelector('#residentesLoading')).toBeNull();
    expect(container.querySelector('#precioKwh').value).toBe('444,44');
  });

  it('asks to log in again without calling the API when the token is gone', async () => {
    sessionStorage.clear();
    const fetchMock = mockRecords();
    const { container } = renderPage();
    calculate(container);

    await waitFor(() => expect(container.querySelector('#residentesErrorMsg')).not.toBeNull());
    expect(container.querySelector('#residentesErrorMsg').textContent).toBe(
      'No estás autenticado. Por favor, iniciá sesión nuevamente.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the empty message when there are no records at all', async () => {
    mockRecords([]);
    const { container, getByText } = renderPage();
    calculate(container);
    await waitFor(() => expect(getByText('No hay registros de consumo para este mes.')).toBeTruthy());
    expect(container.querySelector('#residentesTableContainer')).toBeNull();
  });

  it('renders resident data as text', async () => {
    const evil = `<b onclick=alert(1)>x</b>"'`;
    mockRecords([record('H1', { nombre: evil, habitacion: evil })]);
    const { container } = renderPage();
    calculate(container);
    await loadedRows(container);

    expect(cells(rows(container)[0])[0]).toBe(evil);
    expect(container.querySelector('#residentesTableBody b')).toBeNull();
    select(container, 0);
    expect(container.querySelector('#residenteHabitacionDisplay').textContent).toBe(`Habitación: ${evil}`);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Dashboard from './Dashboard';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const now = new Date();
const thisMonth = now.toISOString();
const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12).toISOString();

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </AuthProvider>,
  );

const mockVouchers = (vouchers) => {
  const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data: vouchers }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
const rows = (container) => [...container.querySelectorAll('#voucherTableBody tr')];
const cells = (row) => [...row.querySelectorAll('td')].map((td) => td.textContent);
const loaded = async (container) => waitFor(() => expect(rows(container).length).toBeGreaterThan(0));

const ana = {
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  email: 'ana@example.com',
  ref4: '1234',
  hab: '5',
  monto: '50.000',
  timestamp: thisMonth,
  files: [{ name: 'comp.png', url: '/uploads/vouchers/comp.png' }],
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem('mayelewoo_admin_token', 'abc');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Dashboard', () => {
  it('renders the admin header, titles, month pager and table headers', async () => {
    mockVouchers([]);
    const { container, getByText } = renderPage();

    const links = [...container.querySelectorAll('nav.nav-menu a.nav-link')].map((a) => a.textContent);
    expect(links).toEqual(['📄 Alquiler', '💧 Servicios', '⚡ Calcular Pago', '🧮 Medidores']);
    expect(getByText('Cerrar Sesión')).toBeTruthy();
    expect(getByText('Dashboard Administrativo')).toBeTruthy();
    expect(getByText('Gestión de datos de usuarios')).toBeTruthy();
    expect(getByText('Datos de Usuarios Registrados')).toBeTruthy();

    const label = container.querySelector('#currentMonthLabel').textContent;
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
    expect([...container.querySelectorAll('#voucherTable th')].map((th) => th.textContent)).toEqual([
      'Nombre',
      'DNI',
      'Email',
      'Ref 4',
      'Hab/Apto',
      'Monto',
      'Fecha',
      'Archivos',
    ]);
    expect(container.querySelector('#imageModal').classList.contains('show')).toBe(false);
    expect(container.querySelector('footer')).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it('requests /api/vouchers without an auth header and lists the vouchers of the month', async () => {
    const fetchMock = mockVouchers([ana, { ...ana, nombre: 'Old', timestamp: previousMonth }]);
    const { container } = renderPage();
    await loaded(container);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/vouchers$/);
    expect(init.headers.Authorization).toBeUndefined();

    expect(rows(container)).toHaveLength(1);
    expect(cells(rows(container)[0]).slice(0, 7)).toEqual([
      'Ana Pérez',
      '30111222',
      'ana@example.com',
      '1234',
      '5',
      '50.000',
      now.toLocaleDateString('es-AR'),
    ]);
    expect(rows(container)[0].querySelector('td').getAttribute('data-label')).toBe('Nombre');
  });

  it('shows dashes for missing values', async () => {
    mockVouchers([{ timestamp: thisMonth }]);
    const { container } = renderPage();
    await loaded(container);
    expect(cells(rows(container)[0])).toEqual(['', '—', '—', '—', '—', '—', now.toLocaleDateString('es-AR'), '—']);
  });

  it('renders an empty table when there are no vouchers', async () => {
    mockVouchers([]);
    const { container } = renderPage();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(rows(container)).toHaveLength(0);
    expect(container.querySelector('#voucherTable')).toBeTruthy();
  });

  it('renders image files as thumbnails on the vouchers base and other files as links', async () => {
    mockVouchers([
      {
        ...ana,
        files: [
          { name: 'comp.png', url: '/uploads/vouchers/comp.png' },
          { name: 'doc.pdf', url: 'https://cdn.example.com/doc.pdf' },
          { name: 'local.pdf' },
        ],
      },
    ]);
    const { container } = renderPage();
    await loaded(container);

    const filesCell = rows(container)[0].querySelectorAll('td')[7];
    const img = filesCell.querySelector('img');
    expect(img.getAttribute('src')).toBe('http://localhost:3000/uploads/vouchers/comp.png');
    expect(img.getAttribute('title')).toBe('Clic para ver completa');

    const links = [...filesCell.querySelectorAll('a')];
    expect(links.map((a) => a.textContent)).toEqual(['doc.pdf', 'local.pdf']);
    expect(links[0].getAttribute('href')).toBe('https://cdn.example.com/doc.pdf');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener');
    expect(links[1].getAttribute('href')).toBe('#');
  });

  it('builds the files from raw `fotos` when the voucher has no files', async () => {
    mockVouchers([{ ...ana, files: undefined, fotos: ['raw.jpg'] }]);
    const { container } = renderPage();
    await loaded(container);
    expect(container.querySelector('#voucherTableBody img').getAttribute('src')).toBe(
      'http://localhost:3000/uploads/vouchers/raw.jpg',
    );
  });

  it('groups by createdAt and fechaHora as well', async () => {
    mockVouchers([
      { ...ana, nombre: 'A', timestamp: undefined, createdAt: thisMonth },
      { ...ana, nombre: 'B', timestamp: undefined, fechaHora: thisMonth },
    ]);
    const { container } = renderPage();
    await waitFor(() => expect(rows(container)).toHaveLength(2));
  });

  it('falls back to the pending vouchers saved by the public form when the request fails', async () => {
    localStorage.setItem(
      'pendingVouchers',
      JSON.stringify([
        { ...ana, nombre: 'Local', files: [{ name: 'a.png', size: 10, type: 'image/png' }] },
      ]),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const { container } = renderPage();
    await loaded(container);

    expect(cells(rows(container)[0])[0]).toBe('Local Pérez');
    // snapshots have no url: no thumbnail, just the file name
    expect(rows(container)[0].querySelector('img')).toBeNull();
    expect(rows(container)[0].querySelector('a').textContent).toBe('a.png');
  });

  it('pages through the months', async () => {
    mockVouchers([ana, { ...ana, nombre: 'Old', timestamp: previousMonth }]);
    const { container } = renderPage();
    await loaded(container);
    const current = container.querySelector('#currentMonthLabel').textContent;

    fireEvent.click(container.querySelector('#prevMonth'));
    expect(container.querySelector('#currentMonthLabel').textContent).not.toBe(current);
    expect(rows(container)).toHaveLength(1);
    expect(cells(rows(container)[0])[0]).toBe('Old Pérez');

    fireEvent.click(container.querySelector('#nextMonth'));
    expect(container.querySelector('#currentMonthLabel').textContent).toBe(current);
    expect(cells(rows(container)[0])[0]).toBe('Ana Pérez');
  });

  it('opens the image modal from a thumbnail and closes it with the X or the backdrop', async () => {
    mockVouchers([ana]);
    const { container } = renderPage();
    await loaded(container);
    const modal = container.querySelector('#imageModal');

    fireEvent.click(container.querySelector('#voucherTableBody img'));
    expect(modal.classList.contains('show')).toBe(true);
    expect(container.querySelector('#modalImage').getAttribute('src')).toBe(
      'http://localhost:3000/uploads/vouchers/comp.png',
    );
    expect(container.querySelector('#modalImageName').textContent).toBe('comp.png');

    fireEvent.click(container.querySelector('#modalImage'));
    expect(modal.classList.contains('show')).toBe(true);

    fireEvent.click(container.querySelector('.close-modal-btn'));
    expect(modal.classList.contains('show')).toBe(false);

    fireEvent.click(container.querySelector('#voucherTableBody img'));
    fireEvent.click(modal);
    expect(modal.classList.contains('show')).toBe(false);
  });

  it('replaces a thumbnail that fails to load with a text link', async () => {
    mockVouchers([ana]);
    const { container } = renderPage();
    await loaded(container);

    fireEvent.error(container.querySelector('#voucherTableBody img'));

    const filesCell = rows(container)[0].querySelectorAll('td')[7];
    expect(filesCell.querySelector('img').style.display).toBe('none');
    const link = filesCell.querySelector('a');
    expect(link.textContent).toBe('comp.png');
    expect(link.getAttribute('href')).toBe('http://localhost:3000/uploads/vouchers/comp.png');
  });
});

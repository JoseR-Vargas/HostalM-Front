import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { POLL_INTERVAL_MS } from '../lib/useAdminNotifications';
import { NOTIFICATIONS_STORAGE_KEY } from '../lib/notifications';

vi.mock('../lib/voucherDashboard', () => ({ fetchVouchers: vi.fn() }));
vi.mock('../lib/meterRecords', async (importOriginal) => ({ ...(await importOriginal()), fetchCalculos: vi.fn() }));

import { fetchCalculos } from '../lib/meterRecords';
import { fetchVouchers } from '../lib/voucherDashboard';
import NotificationBell from './NotificationBell';

const voucher = (id) => ({
  _id: id,
  nombre: 'Ana',
  apellido: 'Pérez',
  hab: '4',
  monto: '150.000',
  timestamp: new Date().toISOString(),
});
const calculo = (id) => ({
  _id: id,
  nombre: 'Beto',
  apellido: 'Gómez',
  habitacion: 'Apto 2',
  consumoCalculado: 60.5,
  createdAt: new Date().toISOString(),
});

let vouchers;
let calculos;

const renderBell = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <NotificationBell />
        <p>outside</p>
      </MemoryRouter>
    </AuthProvider>,
  );

const flush = () => act(async () => vi.advanceTimersByTimeAsync(0));
const nextPoll = () => act(async () => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
const bell = () => screen.getByRole('button', { name: /^Notificaciones/ });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.setItem('mayelewoo_admin_token', 'abc');
  vouchers = [voucher('v1')];
  calculos = [calculo('c1')];
  vi.mocked(fetchVouchers).mockImplementation(async () => vouchers);
  vi.mocked(fetchCalculos).mockImplementation(async () => calculos);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('NotificationBell', () => {
  it('shows no badge for records that already existed when the panel was first opened', async () => {
    renderBell();
    await flush();
    expect(bell().getAttribute('aria-label')).toBe('Notificaciones');
    expect(document.querySelector('.notification-badge')).toBeNull();
  });

  it('flags itself as ready once its first poll has finished, even when it failed', async () => {
    vi.mocked(fetchVouchers).mockRejectedValue(new Error('HTTP 500'));
    vi.mocked(fetchCalculos).mockRejectedValue(new Error('HTTP 500'));
    renderBell();
    expect(document.querySelector('.notification-bell').getAttribute('data-ready')).toBeNull();
    await flush();
    expect(document.querySelector('.notification-bell').getAttribute('data-ready')).toBe('true');
  });

  it('adds a badge when a voucher or a meter reading is uploaded', async () => {
    renderBell();
    await flush();

    vouchers = [...vouchers, voucher('v2')];
    await nextPoll();
    expect(document.querySelector('.notification-badge').textContent).toBe('1');
    expect(bell().getAttribute('aria-label')).toBe('Notificaciones, 1 sin leer');

    calculos = [...calculos, calculo('c2')];
    await nextPoll();
    expect(document.querySelector('.notification-badge').textContent).toBe('2');
  });

  it('lists what was uploaded with a short description and a link to its dashboard', async () => {
    renderBell();
    await flush();
    vouchers = [...vouchers, voucher('v2')];
    calculos = [...calculos, calculo('c2')];
    await nextPoll();

    fireEvent.click(bell());
    const panel = document.getElementById('notificationPanel');
    expect(bell().getAttribute('aria-expanded')).toBe('true');

    const items = within(panel).getAllByRole('link');
    expect(items).toHaveLength(2);
    const byTitle = (title) => items.find((item) => item.textContent.includes(title));

    const voucherItem = byTitle('Nuevo voucher');
    expect(voucherItem.textContent).toContain('Ana Pérez cargó un comprobante de la habitación 4 por $150.000.');
    expect(voucherItem.getAttribute('href')).toBe('/dashboard');

    const meterItem = byTitle('Nueva medición de luz');
    expect(meterItem.textContent).toContain('Beto Gómez registró la medición de Apto 2: 60.5 kWh de consumo.');
    expect(meterItem.getAttribute('href')).toBe('/dashboard-calculator');
  });

  it('shows an empty state when there is nothing to read', async () => {
    renderBell();
    await flush();
    fireEvent.click(bell());
    expect(screen.getByText('No hay notificaciones')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Marcar todo como leído' }).disabled).toBe(true);
  });

  it('marks everything as read', async () => {
    renderBell();
    await flush();
    vouchers = [...vouchers, voucher('v2')];
    await nextPoll();

    fireEvent.click(bell());
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todo como leído' }));
    expect(document.querySelector('.notification-badge')).toBeNull();
    expect(bell().getAttribute('aria-label')).toBe('Notificaciones');
  });

  it('marks one notification as read and closes the panel when it is opened', async () => {
    renderBell();
    await flush();
    vouchers = [...vouchers, voucher('v2')];
    calculos = [...calculos, calculo('c2')];
    await nextPoll();

    fireEvent.click(bell());
    fireEvent.click(within(document.getElementById('notificationPanel')).getByRole('link', { name: /Nuevo voucher/ }));
    expect(document.getElementById('notificationPanel')).toBeNull();
    expect(document.querySelector('.notification-badge').textContent).toBe('1');
  });

  it('closes with Escape and with a click outside', async () => {
    renderBell();
    await flush();

    fireEvent.click(bell());
    expect(document.getElementById('notificationPanel')).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('notificationPanel')).toBeNull();

    fireEvent.click(bell());
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(document.getElementById('notificationPanel')).toBeNull();
  });

  it('keeps unread notifications across a reload', async () => {
    const first = renderBell();
    await flush();
    vouchers = [...vouchers, voucher('v2')];
    await nextPoll();
    expect(JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)).notifications).toHaveLength(1);
    first.unmount();

    renderBell();
    await flush();
    expect(document.querySelector('.notification-badge').textContent).toBe('1');
  });

  it('keeps working when one of the requests fails', async () => {
    renderBell();
    await flush();

    vi.mocked(fetchVouchers).mockRejectedValue(new Error('HTTP 500'));
    calculos = [...calculos, calculo('c2')];
    await nextPoll();
    expect(document.querySelector('.notification-badge').textContent).toBe('1');
  });

  it('stops polling when it unmounts', async () => {
    const { unmount } = renderBell();
    await flush();
    unmount();
    vi.mocked(fetchVouchers).mockClear();
    await nextPoll();
    expect(fetchVouchers).not.toHaveBeenCalled();
  });
});

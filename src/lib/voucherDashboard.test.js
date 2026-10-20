import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchVouchers,
  filterVouchersByMonth,
  formatVoucherDate,
  isImageFile,
  normalizeVoucherFiles,
  readPendingVouchers,
} from './voucherDashboard';

const BASE = 'https://vouchers.example.com';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isImageFile', () => {
  it.each(['a.jpg', 'a.JPEG', 'a.png', 'a.gif', 'a.webp'])('%s is an image', (name) => {
    expect(isImageFile(name)).toBe(true);
  });

  it.each(['a.pdf', 'a.png.txt', '', undefined])('%s is not an image', (name) => {
    expect(isImageFile(name)).toBe(false);
  });
});

describe('filterVouchersByMonth', () => {
  const march = { month: 2, year: 2026 };
  const vouchers = [
    { id: 1, timestamp: '2026-03-10T12:00:00Z' },
    { id: 2, createdAt: '2026-03-11T12:00:00Z' },
    { id: 3, fechaHora: '2026-03-12T12:00:00Z' },
    { id: 4, timestamp: '2026-02-10T12:00:00Z' },
    { id: 5, timestamp: '2025-03-10T12:00:00Z' },
    { id: 6 },
    { id: 7, timestamp: 'garbage' },
  ];

  it('groups by timestamp | createdAt | fechaHora and drops other months and undated records', () => {
    expect(filterVouchersByMonth(vouchers, march).map((v) => v.id)).toEqual([1, 2, 3]);
  });

  it('compares the year too', () => {
    expect(filterVouchersByMonth(vouchers, { month: 2, year: 2025 }).map((v) => v.id)).toEqual([5]);
  });
});

describe('formatVoucherDate', () => {
  it('formats timestamp or createdAt in es-AR', () => {
    const iso = '2026-03-10T15:00:00Z';
    const expected = new Date(iso).toLocaleDateString('es-AR');
    expect(formatVoucherDate({ timestamp: iso })).toBe(expected);
    expect(formatVoucherDate({ createdAt: iso })).toBe(expected);
  });

  it('shows a dash when there is no usable date', () => {
    expect(formatVoucherDate({})).toBe('—');
    expect(formatVoucherDate({ timestamp: 'garbage' })).toBe('—');
    // fechaHora is only used for the month grouping, never for the column
    expect(formatVoucherDate({ fechaHora: '2026-03-10T15:00:00Z' })).toBe('—');
  });
});

describe('normalizeVoucherFiles', () => {
  it('keeps files and prefixes relative urls with the vouchers base', () => {
    const files = normalizeVoucherFiles(
      {
        files: [
          { name: 'a.png', url: '/uploads/vouchers/a.png' },
          { name: 'b.png', url: 'https://cdn.example.com/b.png' },
          { name: 'c.png', size: 10 },
        ],
      },
      `${BASE}/`,
    );
    expect(files).toEqual([
      { name: 'a.png', url: `${BASE}/uploads/vouchers/a.png` },
      { name: 'b.png', url: 'https://cdn.example.com/b.png' },
      { name: 'c.png', size: 10 },
    ]);
  });

  it('builds files from raw `fotos` when there are no files', () => {
    expect(normalizeVoucherFiles({ fotos: ['x.jpg', 'y.png'] }, BASE)).toEqual([
      { name: 'x.jpg', url: `${BASE}/uploads/vouchers/x.jpg` },
      { name: 'y.png', url: `${BASE}/uploads/vouchers/y.png` },
    ]);
    expect(normalizeVoucherFiles({ files: [], fotos: ['x.jpg'] }, BASE)).toHaveLength(1);
  });

  it('prefers files over fotos and does not mutate the voucher', () => {
    const voucher = { files: [{ name: 'a.png', url: '/u/a.png' }], fotos: ['x.jpg'] };
    const files = normalizeVoucherFiles(voucher, BASE);
    expect(files).toEqual([{ name: 'a.png', url: `${BASE}/u/a.png` }]);
    expect(voucher.files[0].url).toBe('/u/a.png');
  });

  it('returns an empty list when nothing usable is present', () => {
    expect(normalizeVoucherFiles({}, BASE)).toEqual([]);
    expect(normalizeVoucherFiles({ files: 'x', fotos: 'y' }, BASE)).toEqual([]);
  });
});

describe('readPendingVouchers', () => {
  it('reads the snapshots saved by the voucher form', () => {
    const snapshot = { nombre: 'Ana', files: [{ name: 'a.png', size: 1, type: 'image/png' }] };
    localStorage.setItem('pendingVouchers', JSON.stringify([snapshot]));
    expect(readPendingVouchers()).toEqual([snapshot]);
  });

  it('returns an empty list when missing, corrupt or not an array', () => {
    expect(readPendingVouchers()).toEqual([]);
    localStorage.setItem('pendingVouchers', '{oops');
    expect(readPendingVouchers()).toEqual([]);
    localStorage.setItem('pendingVouchers', '{"a":1}');
    expect(readPendingVouchers()).toEqual([]);
  });
});

describe('fetchVouchers', () => {
  it('GETs /api/vouchers on the vouchers backend without an auth header and unwraps data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data: [{ nombre: 'Ana' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchVouchers()).resolves.toEqual([{ nombre: 'Ana' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/vouchers$/);
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('accepts a bare array response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([{ nombre: 'Ana' }])));
    await expect(fetchVouchers()).resolves.toEqual([{ nombre: 'Ana' }]);
  });

  it('falls back to the pending vouchers when the request fails', async () => {
    localStorage.setItem('pendingVouchers', JSON.stringify([{ nombre: 'Local' }]));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(fetchVouchers()).resolves.toEqual([{ nombre: 'Local' }]);
  });

  it('falls back on a non-2xx status', async () => {
    localStorage.setItem('pendingVouchers', JSON.stringify([{ nombre: 'Local' }]));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));
    await expect(fetchVouchers()).resolves.toEqual([{ nombre: 'Local' }]);
  });

  it('returns an empty list when the payload is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: true, data: 'nope' })));
    await expect(fetchVouchers()).resolves.toEqual([]);
  });
});

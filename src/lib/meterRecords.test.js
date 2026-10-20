import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeCalculoMetrics,
  fetchCalculos,
  filterCalculosByMonth,
  formatCalculoDate,
  formatDecimal1,
  getCalculoFotoUrl,
  hasFoto,
} from './meterRecords';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('fetchCalculos', () => {
  it('GETs /api/calculos-medidor on the main backend with the Bearer token and unwraps data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data: [{ _id: '1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCalculos({ token: 'abc' })).resolves.toEqual([{ _id: '1' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/calculos-medidor$/);
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  it('sends no auth header when there is no token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchCalculos({});
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('returns an empty list when the body has no data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: true })));
    await expect(fetchCalculos({ token: 'abc' })).resolves.toEqual([]);
  });

  it('throws with the status on a non-2xx answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));
    await expect(fetchCalculos({ token: 'abc' })).rejects.toThrow('Error del servidor: 500');
  });
});

describe('getCalculoFotoUrl', () => {
  it('points to the photo endpoints on the main backend', () => {
    expect(getCalculoFotoUrl('42', 'anterior')).toMatch(/\/api\/calculos-medidor\/42\/foto-anterior$/);
    expect(getCalculoFotoUrl('42', 'actual')).toMatch(/\/api\/calculos-medidor\/42\/foto-actual$/);
  });
});

describe('hasFoto', () => {
  it('requires a stored filename', () => {
    expect(hasFoto({ fotoAnteriorData: { filename: 'a.jpg' } }, 'anterior')).toBe(true);
    expect(hasFoto({ fotoAnteriorData: {} }, 'anterior')).toBe(false);
    expect(hasFoto({}, 'anterior')).toBe(false);
    expect(hasFoto({ fotoActualData: { filename: 'b.jpg' } }, 'actual')).toBe(true);
    expect(hasFoto({ fotoActualData: { filename: 'b.jpg' } }, 'anterior')).toBe(false);
  });
});

describe('filterCalculosByMonth', () => {
  const march = { month: 2, year: 2026 };
  const records = [
    { id: 1, fechaRegistro: '2026-03-10T12:00:00Z' },
    { id: 2, createdAt: '2026-03-11T12:00:00Z' },
    { id: 3, fechaRegistro: '2026-02-10T12:00:00Z', createdAt: '2026-03-11T12:00:00Z' },
    { id: 4, fechaRegistro: '2025-03-10T12:00:00Z' },
    { id: 5 },
    { id: 6, fechaRegistro: 'garbage' },
  ];

  it('prefers fechaRegistro over createdAt and compares month and year', () => {
    expect(filterCalculosByMonth(records, march).map((r) => r.id)).toEqual([1, 2, 5, 6]);
  });

  it('keeps records with a missing or invalid date in every month', () => {
    expect(filterCalculosByMonth(records, { month: 0, year: 2000 }).map((r) => r.id)).toEqual([5, 6]);
  });
});

describe('formatCalculoDate', () => {
  it('formats fechaRegistro (or createdAt) in es-AR and falls back to a dash', () => {
    const iso = '2026-03-10T15:00:00Z';
    const expected = new Date(iso).toLocaleDateString('es-AR');
    expect(formatCalculoDate({ fechaRegistro: iso })).toBe(expected);
    expect(formatCalculoDate({ createdAt: iso })).toBe(expected);
    expect(formatCalculoDate({})).toBe('—');
    expect(formatCalculoDate({ fechaRegistro: 'garbage' })).toBe('—');
  });
});

describe('formatDecimal1', () => {
  it('shows one decimal', () => {
    expect(formatDecimal1(10.55)).toBe('10.6');
    expect(formatDecimal1(3)).toBe('3.0');
  });
});

describe('computeCalculoMetrics', () => {
  it('sums the consumption and averages it with one decimal', () => {
    const metrics = computeCalculoMetrics([
      { consumoCalculado: 10 },
      { consumoCalculado: 20.5 },
      { consumoCalculado: 0.1 },
    ]);
    expect(metrics).toEqual({ totalRegistros: 3, consumoTotal: '30.6', promedioConsumo: '10.2' });
  });

  it('shows a plain 0 average when there are no records', () => {
    expect(computeCalculoMetrics([])).toEqual({
      totalRegistros: 0,
      consumoTotal: '0.0',
      promedioConsumo: '0',
    });
  });
});

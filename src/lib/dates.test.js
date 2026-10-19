import { describe, expect, it } from 'vitest';
import {
  filterByMonth,
  formatMonthLabel,
  getCurrentMonthKey,
  getRecordDate,
  isDateInMonth,
  parseLooseDate,
  shiftMonthKey,
  VOUCHER_DATE_FIELDS,
} from './dates';

describe('parseLooseDate', () => {
  it('parses ISO strings and timestamps', () => {
    expect(parseLooseDate('2026-03-15T12:00:00Z')).toBeInstanceOf(Date);
    expect(parseLooseDate(1773576000000)).toBeInstanceOf(Date);
  });

  it('returns null for empty or invalid values', () => {
    expect(parseLooseDate(undefined)).toBeNull();
    expect(parseLooseDate(null)).toBeNull();
    expect(parseLooseDate('')).toBeNull();
    expect(parseLooseDate('not a date')).toBeNull();
  });
});

describe('getRecordDate', () => {
  it('uses the first present field in order', () => {
    const record = { createdAt: '2026-03-10T12:00:00Z', fechaHora: '2026-01-01T12:00:00Z' };
    const date = getRecordDate(record, VOUCHER_DATE_FIELDS);
    expect(date.toISOString()).toBe('2026-03-10T12:00:00.000Z');
  });

  it('prefers timestamp over createdAt and fechaHora', () => {
    const record = {
      timestamp: '2026-05-02T12:00:00Z',
      createdAt: '2026-03-10T12:00:00Z',
      fechaHora: '2026-01-01T12:00:00Z',
    };
    expect(getRecordDate(record, VOUCHER_DATE_FIELDS).toISOString()).toBe('2026-05-02T12:00:00.000Z');
  });

  it('returns null when no field is usable', () => {
    expect(getRecordDate({}, VOUCHER_DATE_FIELDS)).toBeNull();
    expect(getRecordDate({ timestamp: 'garbage' }, VOUCHER_DATE_FIELDS)).toBeNull();
  });
});

describe('month key helpers', () => {
  it('builds the current month key', () => {
    expect(getCurrentMonthKey(new Date(2026, 9, 19))).toEqual({ month: 9, year: 2026 });
  });

  it('shifts across year boundaries', () => {
    expect(shiftMonthKey({ month: 11, year: 2026 }, 1)).toEqual({ month: 0, year: 2027 });
    expect(shiftMonthKey({ month: 0, year: 2026 }, -1)).toEqual({ month: 11, year: 2025 });
    expect(shiftMonthKey({ month: 5, year: 2026 }, 1)).toEqual({ month: 6, year: 2026 });
  });

  it('checks whether a date falls inside the month key', () => {
    const key = { month: 2, year: 2026 };
    expect(isDateInMonth(new Date(2026, 2, 31), key)).toBe(true);
    expect(isDateInMonth(new Date(2026, 3, 1), key)).toBe(false);
    expect(isDateInMonth(new Date(2025, 2, 10), key)).toBe(false);
  });

  it('formats a Spanish month label, optionally capitalized', () => {
    expect(formatMonthLabel({ month: 9, year: 2026 })).toMatch(/^octubre.*2026$/);
    expect(formatMonthLabel({ month: 9, year: 2026 }, { capitalize: true })).toMatch(/^Octubre.*2026$/);
  });
});

describe('filterByMonth', () => {
  const key = { month: 2, year: 2026 };
  const records = [
    { id: 1, timestamp: new Date(2026, 2, 5).toISOString() },
    { id: 2, timestamp: new Date(2026, 3, 5).toISOString() },
    { id: 3 },
    { id: 4, timestamp: 'garbage' },
  ];
  const getDate = (r) => getRecordDate(r, ['timestamp']);

  it('keeps only records inside the month and drops undated ones by default', () => {
    expect(filterByMonth(records, key, getDate).map((r) => r.id)).toEqual([1]);
  });

  it('can keep undated records', () => {
    expect(filterByMonth(records, key, getDate, { keepUndated: true }).map((r) => r.id)).toEqual([1, 3, 4]);
  });
});

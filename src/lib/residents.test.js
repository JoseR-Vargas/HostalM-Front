import { describe, expect, it } from 'vitest';
import {
  calcularPrecioKwh,
  calcularTotalAPagar,
  findResident,
  getResidentsForMonth,
} from './residents';

const march = { month: 2, year: 2026 };
const record = (habitacion, fechaRegistro, extra = {}) => ({
  nombre: 'N',
  apellido: 'A',
  habitacion,
  consumoCalculado: 10,
  fechaRegistro,
  ...extra,
});

describe('getResidentsForMonth', () => {
  it('keeps only the records of the month and year', () => {
    const records = [
      record('1', '2026-03-05T12:00:00Z'),
      record('2', '2026-04-05T12:00:00Z'),
      record('3', '2025-03-05T12:00:00Z'),
      record('4', 'garbage'),
      record('5', undefined),
    ];
    expect(getResidentsForMonth(records, march).map((r) => r.habitacion)).toEqual(['1']);
  });

  it('keeps the latest record per habitacion', () => {
    const records = [
      record('1', '2026-03-05T12:00:00Z', { consumoCalculado: 1 }),
      record('1', '2026-03-20T12:00:00Z', { consumoCalculado: 3 }),
      record('1', '2026-03-10T12:00:00Z', { consumoCalculado: 2 }),
    ];
    const residents = getResidentsForMonth(records, march);
    expect(residents).toHaveLength(1);
    expect(residents[0].consumoCalculado).toBe(3);
  });

  it('keeps the first record when two share the exact same date', () => {
    const records = [
      record('1', '2026-03-05T12:00:00Z', { consumoCalculado: 1 }),
      record('1', '2026-03-05T12:00:00Z', { consumoCalculado: 2 }),
    ];
    expect(getResidentsForMonth(records, march)[0].consumoCalculado).toBe(1);
  });

  it('sorts alphabetically by habitacion', () => {
    const records = [
      record('Hab 10', '2026-03-05T12:00:00Z'),
      record('Apto B', '2026-03-05T12:00:00Z'),
      record('Apto A', '2026-03-05T12:00:00Z'),
    ];
    expect(getResidentsForMonth(records, march).map((r) => r.habitacion)).toEqual([
      'Apto A',
      'Apto B',
      'Hab 10',
    ]);
  });

  it('does not mutate the input and handles an empty list', () => {
    const records = [record('B', '2026-03-05T12:00:00Z'), record('A', '2026-03-05T12:00:00Z')];
    getResidentsForMonth(records, march);
    expect(records.map((r) => r.habitacion)).toEqual(['B', 'A']);
    expect(getResidentsForMonth([], march)).toEqual([]);
  });
});

describe('findResident', () => {
  it('finds by habitacion or returns null', () => {
    const residents = [record('A', 'x'), record('B', 'x')];
    expect(findResident(residents, 'B')).toBe(residents[1]);
    expect(findResident(residents, 'Z')).toBeNull();
  });
});

describe('price and total', () => {
  it('precio = monto / totalKwh', () => {
    expect(calcularPrecioKwh(200000, 400)).toBe(500);
    expect(calcularPrecioKwh(1000, 3)).toBeCloseTo(333.3333, 4);
  });

  it('total = consumo * precio (full precision, no early rounding)', () => {
    const precio = calcularPrecioKwh(200000, 450);
    expect(calcularTotalAPagar(100.5, precio)).toBeCloseTo((100.5 * 200000) / 450, 6);
    expect(calcularTotalAPagar(0, precio)).toBe(0);
  });
});

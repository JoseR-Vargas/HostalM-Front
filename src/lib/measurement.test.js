import { describe, expect, it } from 'vitest';
import {
  calculateConsumo,
  calculateMontoTotal,
  formatKwh,
  isCurrentGreaterThanPrevious,
  isValidDni,
  isValidMeasurementFormat,
  normalizeMeasurement,
  parseMeasurement,
  sanitizeMeasurementInput,
} from './measurement';
import { PRICE_PER_KWH } from './constants';

describe('isValidMeasurementFormat', () => {
  it('requires digits, a dot or comma, and decimal digits', () => {
    expect(isValidMeasurementFormat('408.7')).toBe(true);
    expect(isValidMeasurementFormat('0035,3')).toBe(true);
    expect(isValidMeasurementFormat('003565,2')).toBe(true);
    expect(isValidMeasurementFormat(' 1234.5 ')).toBe(true);
  });

  it('rejects integers, empty values and malformed numbers', () => {
    expect(isValidMeasurementFormat('35659')).toBe(false);
    expect(isValidMeasurementFormat('')).toBe(false);
    expect(isValidMeasurementFormat('12.')).toBe(false);
    expect(isValidMeasurementFormat('.5')).toBe(false);
    expect(isValidMeasurementFormat('1.2.3')).toBe(false);
  });
});

describe('normalizeMeasurement', () => {
  it('inserts a decimal point before the last digit of an integer', () => {
    expect(normalizeMeasurement('35659')).toBe('3565.9');
    expect(normalizeMeasurement('38773')).toBe('3877.3');
    expect(normalizeMeasurement(' 38773 ')).toBe('3877.3');
  });

  it('replaces the comma by a dot and keeps dotted values', () => {
    expect(normalizeMeasurement('3565,9')).toBe('3565.9');
    expect(normalizeMeasurement('3565.9')).toBe('3565.9');
  });

  it('leaves single digits and empty values untouched', () => {
    expect(normalizeMeasurement('5')).toBe('5');
    expect(normalizeMeasurement('')).toBe('');
    expect(normalizeMeasurement(undefined)).toBeUndefined();
  });
});

describe('sanitizeMeasurementInput', () => {
  it('keeps only digits and the first decimal separator', () => {
    expect(sanitizeMeasurementInput('12a3')).toBe('123');
    expect(sanitizeMeasurementInput('12.3,4')).toBe('12.34');
    expect(sanitizeMeasurementInput('1,2.3.4')).toBe('1,234');
  });
});

describe('parseMeasurement', () => {
  it('normalizes then parses, defaulting to 0', () => {
    expect(parseMeasurement('35659')).toBeCloseTo(3565.9);
    expect(parseMeasurement('3565,9')).toBeCloseTo(3565.9);
    expect(parseMeasurement('')).toBe(0);
    expect(parseMeasurement('abc')).toBe(0);
  });
});

describe('isCurrentGreaterThanPrevious', () => {
  it('fails only when both are positive and actual <= anterior', () => {
    expect(isCurrentGreaterThanPrevious('3500,1', '3565,9')).toBe(true);
    expect(isCurrentGreaterThanPrevious('3565.9', '3565.9')).toBe(false);
    expect(isCurrentGreaterThanPrevious('3565.9', '3500.1')).toBe(false);
    expect(isCurrentGreaterThanPrevious('', '3500.1')).toBe(true);
    expect(isCurrentGreaterThanPrevious('3500.1', '')).toBe(true);
  });

  it('applies integer normalization before comparing', () => {
    // 35000 -> 3500.0 and 35659 -> 3565.9
    expect(isCurrentGreaterThanPrevious('35000', '35659')).toBe(true);
    expect(isCurrentGreaterThanPrevious('35659', '35000')).toBe(false);
  });
});

describe('isValidDni', () => {
  it('accepts 7 or 8 digits only', () => {
    expect(isValidDni('1234567')).toBe(true);
    expect(isValidDni('12345678')).toBe(true);
    expect(isValidDni('123456')).toBe(false);
    expect(isValidDni('123456789')).toBe(false);
    expect(isValidDni('12a45678')).toBe(false);
    expect(isValidDni('')).toBe(false);
  });
});

describe('consumo and total', () => {
  it('uses the fixed kWh price', () => {
    expect(PRICE_PER_KWH).toBe(439.26);
  });

  it('computes consumo as actual minus anterior', () => {
    expect(calculateConsumo(3500.1, 3565.9)).toBeCloseTo(65.8);
  });

  it('computes the total amount from consumo', () => {
    expect(calculateMontoTotal(10)).toBeCloseTo(4392.6);
    expect(calculateMontoTotal(65.8)).toBeCloseTo(65.8 * 439.26);
  });

  it('formats consumo with one decimal and unit', () => {
    expect(formatKwh(65.8)).toBe('65.8 kWh');
    expect(formatKwh(10)).toBe('10.0 kWh');
  });
});

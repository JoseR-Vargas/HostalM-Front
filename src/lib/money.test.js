import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatMontoInput,
  formatMontoInputWithCaret,
  isValidVoucherAmountFormat,
  normalizeDecimal,
  parseMontoFactura,
  parsePositive,
  validateVoucherAmount,
} from './money';

describe('parseMontoFactura', () => {
  it('parses Argentine thousands and decimal separators', () => {
    expect(parseMontoFactura('200.000,50')).toBe(200000.5);
    expect(parseMontoFactura('1.000')).toBe(1000);
    expect(parseMontoFactura(' 17.614,33 ')).toBe(17614.33);
  });

  it('returns NaN for empty, non-positive or invalid values', () => {
    expect(parseMontoFactura('')).toBeNaN();
    expect(parseMontoFactura(undefined)).toBeNaN();
    expect(parseMontoFactura('0')).toBeNaN();
    expect(parseMontoFactura('-5')).toBeNaN();
    expect(parseMontoFactura('abc')).toBeNaN();
  });
});

describe('normalizeDecimal / parsePositive', () => {
  it('accepts a comma or a dot as decimal separator', () => {
    expect(normalizeDecimal(' 12,5 ')).toBe('12.5');
    expect(parsePositive('12,5')).toBe(12.5);
    expect(parsePositive('3.25')).toBe(3.25);
  });

  it('returns NaN for zero, negative, empty or invalid input', () => {
    expect(parsePositive('0')).toBeNaN();
    expect(parsePositive('-1')).toBeNaN();
    expect(parsePositive('')).toBeNaN();
    expect(parsePositive(null)).toBeNaN();
    expect(parsePositive('x')).toBeNaN();
  });
});

describe('formatMontoInput', () => {
  it('inserts thousands dots while typing and keeps the decimal part', () => {
    expect(formatMontoInput('200000,50')).toBe('200.000,50');
    expect(formatMontoInput('1234567')).toBe('1.234.567');
    expect(formatMontoInput('12')).toBe('12');
  });

  it('drops non numeric characters', () => {
    expect(formatMontoInput('1a2b3c4')).toBe('1.234');
    expect(formatMontoInput('10.000,5x')).toBe('10.000,5');
  });
});

describe('formatMontoInputWithCaret', () => {
  it('moves the caret past the dots inserted before it', () => {
    // typing a digit at the end of "999" -> "9999" -> "9.999"
    expect(formatMontoInputWithCaret('9999', 4)).toEqual({ value: '9.999', caret: 5 });
  });

  it('keeps the caret on the same digit when typing in the middle', () => {
    // "1.000" with "5" typed after the first "1" -> raw "15.000", caret 2
    expect(formatMontoInputWithCaret('15.000', 2)).toEqual({ value: '15.000', caret: 2 });
    // raw "1.2500" (a 5 typed after "2"), caret 4 -> "12.500", caret after the "5"
    expect(formatMontoInputWithCaret('1.2500', 4)).toEqual({ value: '12.500', caret: 4 });
  });

  it('moves the caret back when a dot disappears after deleting', () => {
    // "1.000" -> backspace on the last 0 -> raw "1.00", caret 4 -> "100", caret 3
    expect(formatMontoInputWithCaret('1.00', 4)).toEqual({ value: '100', caret: 3 });
  });

  it('puts the dot back and keeps the caret after the digit when the dot is deleted', () => {
    expect(formatMontoInputWithCaret('1000', 1)).toEqual({ value: '1.000', caret: 1 });
  });

  it('drops invalid characters without moving the caret past the end', () => {
    expect(formatMontoInputWithCaret('12a', 3)).toEqual({ value: '12', caret: 2 });
    // a second comma is removed
    expect(formatMontoInputWithCaret('1,5,', 4)).toEqual({ value: '1,5', caret: 3 });
  });

  it('handles an empty value', () => {
    expect(formatMontoInputWithCaret('', 0)).toEqual({ value: '', caret: 0 });
  });
});

describe('formatMoney', () => {
  it('formats with dot thousands and comma decimals', () => {
    expect(formatMoney(17614.333)).toBe('17.614,33');
    expect(formatMoney(0)).toBe('0,00');
    expect(formatMoney(1000)).toBe('1.000,00');
    expect(formatMoney(1234567.891)).toBe('1.234.567,89');
  });
});

describe('voucher amount validation', () => {
  it('accepts correctly formatted amounts', () => {
    expect(isValidVoucherAmountFormat('1.000')).toBe(true);
    expect(isValidVoucherAmountFormat('50.000')).toBe(true);
    expect(isValidVoucherAmountFormat('200.000,5')).toBe(true);
    expect(isValidVoucherAmountFormat('1.000.000,50')).toBe(true);
  });

  it('rejects amounts without proper thousands separators', () => {
    expect(isValidVoucherAmountFormat('10000')).toBe(false);
    expect(isValidVoucherAmountFormat('1.00')).toBe(false);
    expect(isValidVoucherAmountFormat('10.000,123')).toBe(false);
  });

  it('returns no errors for a valid amount', () => {
    expect(validateVoucherAmount('50.000')).toEqual([]);
    expect(validateVoucherAmount('1.000')).toEqual([]);
  });

  it('requires an amount', () => {
    expect(validateVoucherAmount('')).toEqual(['El monto depositado es requerido']);
  });

  it('flags amounts under 1000', () => {
    expect(validateVoucherAmount('999')).toEqual([
      'Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)',
    ]);
  });

  it('reports the minimum error first when both checks fail', () => {
    const errors = validateVoucherAmount('0.5');
    expect(errors[0]).toBe('Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)');
    expect(errors).toHaveLength(2);
  });

  it('flags a missing thousands separator', () => {
    expect(validateVoucherAmount('10000')).toEqual([
      'El monto debe estar en formato correcto con separador de miles. Ejemplo: 1.000, 10.000, 20.000',
    ]);
  });

  it('keeps the numeric check that strips every dot (decimal comma becomes a dot first)', () => {
    // "500,50" -> "500.50" -> "50050" >= 1000, so only the format check applies and it passes.
    expect(validateVoucherAmount('500,50')).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  RECEIPT_MONTHS,
  buildPaymentReceipt,
  buildServicesReceipt,
  formatReceiptDate,
  formatReceiptMoney,
  getPaymentReceiptFilename,
  getServicesReceiptFilename,
  parseReceiptAmount,
  validatePaymentReceipt,
  validateServicesReceipt,
} from './receipts';

describe('RECEIPT_MONTHS', () => {
  it('lists the twelve months in Spanish', () => {
    expect(RECEIPT_MONTHS).toHaveLength(12);
    expect(RECEIPT_MONTHS[0]).toBe('Enero');
    expect(RECEIPT_MONTHS[8]).toBe('Septiembre');
    expect(RECEIPT_MONTHS[11]).toBe('Diciembre');
  });
});

describe('parseReceiptAmount', () => {
  it('parses Argentine formatted amounts', () => {
    expect(parseReceiptAmount('200.000')).toBe(200000);
    expect(parseReceiptAmount('200.000,50')).toBe(200000.5);
    expect(parseReceiptAmount('5000,50')).toBe(5000.5);
    expect(parseReceiptAmount('1.234.567')).toBe(1234567);
    expect(parseReceiptAmount(' 8.000 ')).toBe(8000);
  });

  it('keeps a dot that is not a thousands separator as a decimal point', () => {
    expect(parseReceiptAmount('5.5')).toBe(5.5);
  });

  it('returns NaN for empty, non numeric or non positive values', () => {
    expect(parseReceiptAmount('')).toBeNaN();
    expect(parseReceiptAmount(undefined)).toBeNaN();
    expect(parseReceiptAmount('abc')).toBeNaN();
    expect(parseReceiptAmount('0')).toBeNaN();
    expect(parseReceiptAmount('0,00')).toBeNaN();
    expect(parseReceiptAmount('-5')).toBeNaN();
  });
});

describe('formatReceiptMoney', () => {
  it('prefixes the dollar sign and uses dots/comma', () => {
    expect(formatReceiptMoney(200000)).toBe('$200.000,00');
    expect(formatReceiptMoney(1234567.891)).toBe('$1.234.567,89');
    expect(formatReceiptMoney(0.5)).toBe('$0,50');
    expect(formatReceiptMoney(13000.5)).toBe('$13.000,50');
  });
});

describe('formatReceiptDate', () => {
  it('turns YYYY-MM-DD into DD/MM/YYYY', () => {
    expect(formatReceiptDate('2026-10-19')).toBe('19/10/2026');
  });

  it('returns an empty string without a date', () => {
    expect(formatReceiptDate('')).toBe('');
    expect(formatReceiptDate(undefined)).toBe('');
  });
});

const PAYMENT = {
  cliente: 'Jennifer Martínez',
  propiedad: 'Humberto Primo 3070 Habitación 4',
  periodo: 'Octubre',
  fecha: '2026-10-19',
  monto: '200.000,50',
};

describe('validatePaymentReceipt', () => {
  it('accepts a complete form', () => {
    expect(validatePaymentReceipt(PAYMENT)).toEqual([]);
  });

  it('reports every invalid field, in form order', () => {
    expect(validatePaymentReceipt({ cliente: '', propiedad: '', periodo: '', fecha: '', monto: '' })).toEqual([
      'cliente',
      'propiedad',
      'periodo',
      'fecha',
      'monto',
    ]);
  });

  it('treats whitespace-only text as empty', () => {
    expect(validatePaymentReceipt({ ...PAYMENT, cliente: '   ', propiedad: ' ' })).toEqual(['cliente', 'propiedad']);
  });

  it('rejects zero and non numeric amounts', () => {
    expect(validatePaymentReceipt({ ...PAYMENT, monto: '0' })).toEqual(['monto']);
    expect(validatePaymentReceipt({ ...PAYMENT, monto: 'abc' })).toEqual(['monto']);
  });
});

describe('buildPaymentReceipt', () => {
  it('builds the template content in upper case with the amount as total', () => {
    expect(buildPaymentReceipt(PAYMENT)).toEqual({
      fecha: '19/10/2026',
      cliente: 'JENNIFER MARTÍNEZ',
      propiedad: 'HUMBERTO PRIMO 3070 HABITACIÓN 4',
      periodo: 'OCTUBRE',
      monto: '$200.000,50',
      total: '$200.000,50',
    });
  });

  it('leaves the amounts empty while the amount is not valid', () => {
    expect(buildPaymentReceipt({ ...PAYMENT, monto: '' })).toMatchObject({ monto: '', total: '' });
  });
});

describe('getPaymentReceiptFilename', () => {
  it('replaces whitespace runs in the client name with underscores', () => {
    expect(getPaymentReceiptFilename('Jennifer Martínez', 'Octubre')).toBe('Comprobante_Jennifer_Martínez_Octubre.pdf');
    expect(getPaymentReceiptFilename('Ana   María  López', 'Mayo')).toBe('Comprobante_Ana_María_López_Mayo.pdf');
  });

  it('does not trim the client name', () => {
    expect(getPaymentReceiptFilename(' Ana ', 'Mayo')).toBe('Comprobante__Ana__Mayo.pdf');
  });
});

const SERVICES = {
  cliente: 'Jennifer Martínez',
  propiedad: 'Humberto Primo 3070 Habitación 4',
  periodo: 'Octubre',
  fecha: '2026-10-19',
  montoAgua: '5.000',
  montoLuz: '8.000,50',
};

describe('validateServicesReceipt', () => {
  it('accepts a complete form', () => {
    expect(validateServicesReceipt(SERVICES)).toEqual([]);
  });

  it('reports every invalid field, in form order', () => {
    expect(
      validateServicesReceipt({ cliente: '', propiedad: '', periodo: '', fecha: '', montoAgua: '', montoLuz: '' }),
    ).toEqual(['cliente', 'propiedad', 'periodo', 'fecha', 'montoAgua', 'montoLuz']);
  });

  it('validates the water and light amounts independently', () => {
    expect(validateServicesReceipt({ ...SERVICES, montoAgua: '0' })).toEqual(['montoAgua']);
    expect(validateServicesReceipt({ ...SERVICES, montoLuz: 'x' })).toEqual(['montoLuz']);
  });
});

describe('buildServicesReceipt', () => {
  it('adds water and light into the total', () => {
    expect(buildServicesReceipt(SERVICES)).toEqual({
      fecha: '19/10/2026',
      cliente: 'JENNIFER MARTÍNEZ',
      propiedad: 'HUMBERTO PRIMO 3070 HABITACIÓN 4',
      periodo: 'OCTUBRE',
      montoAgua: '$5.000,00',
      montoLuz: '$8.000,50',
      total: '$13.000,50',
    });
  });

  it('shows the valid amount and leaves the total empty when one is missing', () => {
    expect(buildServicesReceipt({ ...SERVICES, montoLuz: '' })).toMatchObject({
      montoAgua: '$5.000,00',
      montoLuz: '',
      total: '',
    });
  });
});

describe('getServicesReceiptFilename', () => {
  it('uses the Servicios prefix', () => {
    expect(getServicesReceiptFilename('Jennifer Martínez', 'Octubre')).toBe(
      'Comprobante_Servicios_Jennifer_Martínez_Octubre.pdf',
    );
  });
});

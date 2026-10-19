const THOUSANDS_REGEX = /\B(?=(\d{3})+(?!\d))/g;

// Voucher amount with dot thousands separators and an optional comma decimal part.
const VOUCHER_AMOUNT_REGEX = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$/;

/** Accepts ',' or '.' as decimal separator. */
export function normalizeDecimal(value) {
  return (value || '').trim().replace(',', '.');
}

/** Parses a positive decimal (kWh fields). Returns NaN when invalid or <= 0. */
export function parsePositive(value) {
  const n = parseFloat(normalizeDecimal(value));
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/**
 * Parses an Argentine formatted amount (dots as thousands, comma as decimals).
 * Example: "200.000,50" -> 200000.5. Returns NaN when invalid or <= 0.
 */
export function parseMontoFactura(value) {
  const normalized = (value || '').trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/**
 * Adds thousands dots to an amount while the user types.
 * Example: "200000,50" -> "200.000,50".
 */
export function formatMontoInput(value) {
  const cleaned = value.replace(/[^0-9,]/g, '');
  const commaIdx = cleaned.indexOf(',');
  let intPart = cleaned;
  let decPart = '';
  if (commaIdx !== -1) {
    intPart = cleaned.slice(0, commaIdx);
    decPart = ',' + cleaned.slice(commaIdx + 1).replace(/[^0-9]/g, '');
  }
  return intPart.replace(THOUSANDS_REGEX, '.') + decPart;
}

/** Argentine money format. Example: 17614.333 -> "17.614,33". */
export function formatMoney(amount) {
  const [intPart, decPart] = amount.toFixed(2).split('.');
  return `${intPart.replace(THOUSANDS_REGEX, '.')},${decPart}`;
}

export function isValidVoucherAmountFormat(value) {
  return VOUCHER_AMOUNT_REGEX.test(value);
}

/**
 * Validates the voucher amount field and returns the list of error messages
 * (empty when valid), in the same order as the legacy form.
 *
 * Parity note: the numeric minimum check mirrors the legacy code, which turns the
 * decimal comma into a dot and then strips every dot ("500,50" -> 50050).
 */
export function validateVoucherAmount(monto) {
  if (!monto) return ['El monto depositado es requerido'];

  const errors = [];
  const numeric = parseFloat(monto.replace(',', '.').replace(/\./g, ''));
  if (numeric < 1000) {
    errors.push('Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)');
  }
  if (!isValidVoucherAmountFormat(monto)) {
    errors.push('El monto debe estar en formato correcto con separador de miles. Ejemplo: 1.000, 10.000, 20.000');
  }
  return errors;
}

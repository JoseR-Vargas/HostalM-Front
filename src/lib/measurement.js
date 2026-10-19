import { PRICE_PER_KWH } from './constants';

// digits + dot/comma + decimal digits (e.g. 0035.3, 003565,2, 408.7)
const MEASUREMENT_REGEX = /^\d+[.,]\d+$/;
const DNI_REGEX = /^\d{7,8}$/;

export function isValidMeasurementFormat(value) {
  if (!value) return false;
  return MEASUREMENT_REGEX.test(value.trim());
}

/**
 * Normalizes a meter reading:
 * - "35659" -> "3565.9" (integers get the decimal point before the last digit)
 * - "3565,9" -> "3565.9"
 */
export function normalizeMeasurement(value) {
  if (!value) return value;

  const trimmed = value.trim();

  if (trimmed.includes('.') || trimmed.includes(',')) {
    return trimmed.replace(',', '.');
  }

  if (/^\d+$/.test(trimmed) && trimmed.length > 1) {
    const insertPosition = trimmed.length - 1;
    return trimmed.slice(0, insertPosition) + '.' + trimmed.slice(insertPosition);
  }

  return trimmed;
}

/** Live input filter: only digits and a single decimal separator (the first one). */
export function sanitizeMeasurementInput(value) {
  let sanitized = value.replace(/[^0-9.,]/g, '');
  const separators = sanitized.match(/[.,]/g);
  if (separators && separators.length > 1) {
    const firstIndex = sanitized.search(/[.,]/);
    sanitized =
      sanitized.slice(0, firstIndex + 1) +
      sanitized.slice(firstIndex + 1).replace(/[.,]/g, '');
  }
  return sanitized;
}

/** Normalizes then parses a reading. Returns 0 when it is not a number. */
export function parseMeasurement(value) {
  return parseFloat(normalizeMeasurement(value)) || 0;
}

/**
 * True unless both readings are present and the current one is not greater
 * than the previous one.
 */
export function isCurrentGreaterThanPrevious(anterior, actual) {
  const previous = parseMeasurement(anterior);
  const current = parseMeasurement(actual);
  return !(current > 0 && previous > 0 && current <= previous);
}

export function isValidDni(value) {
  return DNI_REGEX.test(value);
}

export function calculateConsumo(anterior, actual) {
  return actual - anterior;
}

export function calculateMontoTotal(consumo) {
  return consumo * PRICE_PER_KWH;
}

export function formatKwh(consumo) {
  return `${consumo.toFixed(1)} kWh`;
}

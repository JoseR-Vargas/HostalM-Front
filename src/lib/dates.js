// Date fields a voucher may carry, in priority order.
export const VOUCHER_DATE_FIELDS = ['timestamp', 'createdAt', 'fechaHora'];

/** Parses a date-like value. Returns null when empty or invalid. */
export function parseLooseDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Reads the first present field from the list and parses it.
 * Returns null when no field has a usable date.
 */
export function getRecordDate(record, fields) {
  for (const field of fields) {
    if (record[field]) return parseLooseDate(record[field]);
  }
  return null;
}

/** A month key is `{ month: 0-11, year }`. */
export function getCurrentMonthKey(now = new Date()) {
  return { month: now.getMonth(), year: now.getFullYear() };
}

export function shiftMonthKey({ month, year }, delta) {
  const shifted = month + delta;
  if (shifted > 11) return { month: 0, year: year + 1 };
  if (shifted < 0) return { month: 11, year: year - 1 };
  return { month: shifted, year };
}

export function isDateInMonth(date, { month, year }) {
  return date.getMonth() === month && date.getFullYear() === year;
}

/** Spanish month label, e.g. "octubre de 2026" (capitalized on request). */
export function formatMonthLabel({ month, year }, { capitalize = false } = {}) {
  const label = new Date(year, month).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

/**
 * Keeps the records whose date falls in the month.
 * `getDate(record)` returns a Date or null; undated records are dropped
 * unless `keepUndated` is true.
 */
export function filterByMonth(records, monthKey, getDate, { keepUndated = false } = {}) {
  return records.filter((record) => {
    const date = getDate(record);
    if (!date) return keepUndated;
    return isDateInMonth(date, monthKey);
  });
}

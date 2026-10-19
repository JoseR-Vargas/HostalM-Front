import { formatMoney } from './money';

export const RECEIPT_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Parses an amount typed in the receipt forms. Returns NaN when empty, not numeric or <= 0.
 *
 * Parity note: this is the legacy `normalizeMoney`. A dot is only dropped when it is a
 * thousands separator (followed by exactly three digits), so "5.5" stays 5.5, unlike
 * `parseMontoFactura`, which drops every dot.
 */
export function parseReceiptAmount(value) {
  if (!value) return NaN;
  const normalized = value
    .trim()
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const amount = parseFloat(normalized);
  return Number.isNaN(amount) || amount <= 0 ? NaN : amount;
}

/** Example: 13000.5 -> "$13.000,50". */
export function formatReceiptMoney(amount) {
  return `$${formatMoney(amount)}`;
}

/** YYYY-MM-DD -> DD/MM/YYYY. */
export function formatReceiptDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/** Today as YYYY-MM-DD (UTC, as the legacy pages did). */
export function getDefaultReceiptDate(now = new Date()) {
  return now.toISOString().split('T')[0];
}

function receiptFilename(prefix, cliente, periodo) {
  return `${prefix}_${cliente.replace(/\s+/g, '_')}_${periodo}.pdf`;
}

export function getPaymentReceiptFilename(cliente, periodo) {
  return receiptFilename('Comprobante', cliente, periodo);
}

export function getServicesReceiptFilename(cliente, periodo) {
  return receiptFilename('Comprobante_Servicios', cliente, periodo);
}

/** Returns the names of the invalid fields, in form order. `amountFields` are validated as amounts. */
function validateReceipt(values, amountFields) {
  const errors = [];
  if (!values.cliente.trim()) errors.push('cliente');
  if (!values.propiedad.trim()) errors.push('propiedad');
  if (!values.periodo) errors.push('periodo');
  if (!values.fecha) errors.push('fecha');
  for (const field of amountFields) {
    if (Number.isNaN(parseReceiptAmount(values[field]))) errors.push(field);
  }
  return errors;
}

export function validatePaymentReceipt(values) {
  return validateReceipt(values, ['monto']);
}

export function validateServicesReceipt(values) {
  return validateReceipt(values, ['montoAgua', 'montoLuz']);
}

// Shared by both receipt templates.
function buildCommonContent(values) {
  return {
    fecha: formatReceiptDate(values.fecha),
    cliente: values.cliente.toUpperCase(),
    propiedad: values.propiedad.toUpperCase(),
    periodo: values.periodo.toUpperCase(),
  };
}

function formatAmountOrEmpty(amount) {
  return Number.isNaN(amount) ? '' : formatReceiptMoney(amount);
}

/** Text shown in the payment receipt. Amounts stay empty until the amount is valid. */
export function buildPaymentReceipt(values) {
  const monto = formatAmountOrEmpty(parseReceiptAmount(values.monto));
  return { ...buildCommonContent(values), monto, total: monto };
}

/** Text shown in the services receipt. The total is water + light, empty until both are valid. */
export function buildServicesReceipt(values) {
  const agua = parseReceiptAmount(values.montoAgua);
  const luz = parseReceiptAmount(values.montoLuz);
  return {
    ...buildCommonContent(values),
    montoAgua: formatAmountOrEmpty(agua),
    montoLuz: formatAmountOrEmpty(luz),
    total: formatAmountOrEmpty(agua + luz),
  };
}

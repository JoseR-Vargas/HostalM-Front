import { apiFetch } from './apiClient';
import { buildApiUrl, getApiBase } from './apiConfig';
import { PRICE_PER_KWH, TOKEN_STORAGE_KEY } from './constants';
import {
  calculateConsumo,
  calculateMontoTotal,
  isCurrentGreaterThanPrevious,
  isValidDni,
  isValidMeasurementFormat,
  normalizeMeasurement,
} from './measurement';

const HISTORY_KEY = 'meterCalculations';
const LAST_CALCULATION_KEY = 'lastCalculation';
const PENDING_SYNC_KEY = 'pendingSyncCalculations';
const HISTORY_LIMIT = 50;

const REQUIRED_MESSAGE = 'Este campo es requerido';
export const MEASUREMENT_FORMAT_ERROR =
  'Formato requerido: número con punto o coma decimal (Ej: 408.7 o 0035,3)';
export const DNI_ERROR = 'Ingrese un DNI válido (7-8 dígitos)';

const PERSONAL_FIELDS = ['nombre', 'apellido', 'dni', 'habitacion'];

function readList(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/** Copy of a calculation that is safe to store (no File objects). */
function withoutPhotos(calculation) {
  const { fotoAnterior, fotoActual, ...rest } = calculation;
  return rest;
}

/**
 * Validates the whole form. Returns `{ field: message }` (empty when valid).
 * `photos` tells whether each meter photo was chosen.
 */
export function validateMeterForm(values, { hasAnterior, hasActual }) {
  const errors = {};

  for (const field of ['nombre', 'apellido', 'dni', 'habitacion']) {
    if (!values[field].trim()) errors[field] = REQUIRED_MESSAGE;
  }
  for (const field of ['medicionAnterior', 'medicionActual']) {
    const value = values[field].trim();
    if (!value) errors[field] = REQUIRED_MESSAGE;
    else if (!isValidMeasurementFormat(value)) errors[field] = MEASUREMENT_FORMAT_ERROR;
  }

  if (!isCurrentGreaterThanPrevious(values.medicionAnterior, values.medicionActual)) {
    errors.medicionActual = 'La medición actual debe ser mayor a la anterior';
  }

  if (values.dni && !isValidDni(values.dni)) errors.dni = DNI_ERROR;

  if (!hasAnterior) errors.fotoAnterior = 'Debe cargar la foto del medidor del mes anterior';
  if (!hasActual) errors.fotoActual = 'Debe cargar la foto del medidor del mes actual';

  return errors;
}

/** Consumption (kWh) shown in the live preview, or null when it cannot be calculated. */
export function getConsumptionPreview(anterior, actual) {
  const previous = parseFloat(normalizeMeasurement(anterior)) || 0;
  const current = parseFloat(normalizeMeasurement(actual)) || 0;
  if (previous > 0 && current > previous) return calculateConsumo(previous, current);
  return null;
}

/** Builds the record sent to the server from validated form values. */
export function buildMeterCalculation(values, { fotoAnterior, fotoActual }, now = new Date()) {
  const anterior = parseFloat(normalizeMeasurement(values.medicionAnterior));
  const actual = parseFloat(normalizeMeasurement(values.medicionActual));
  const consumo = calculateConsumo(anterior, actual);

  return {
    nombre: values.nombre.trim(),
    apellido: values.apellido.trim(),
    dni: values.dni,
    habitacion: values.habitacion.trim(),
    medicionAnterior: anterior,
    medicionActual: actual,
    consumoCalculado: consumo,
    montoTotal: calculateMontoTotal(consumo),
    precioKWH: PRICE_PER_KWH,
    fotoAnterior,
    fotoActual,
    fechaRegistro: now.toISOString(),
    timestamp: now.getTime(),
  };
}

function buildFormData(calculation) {
  const formData = new FormData();
  formData.append('nombre', calculation.nombre);
  formData.append('apellido', calculation.apellido);
  formData.append('dni', calculation.dni);
  formData.append('habitacion', calculation.habitacion);
  formData.append('medicionAnterior', calculation.medicionAnterior.toString());
  formData.append('medicionActual', calculation.medicionActual.toString());
  formData.append('consumoCalculado', calculation.consumoCalculado.toString());
  formData.append('montoTotal', calculation.montoTotal.toString());
  formData.append('precioKWH', calculation.precioKWH.toString());
  formData.append('fechaRegistro', calculation.fechaRegistro);
  formData.append('timestamp', calculation.timestamp.toString());
  if (calculation.fotoAnterior) formData.append('fotoAnterior', calculation.fotoAnterior);
  if (calculation.fotoActual) formData.append('fotoActual', calculation.fotoActual);
  return formData;
}

/**
 * POST /api/calculos-medidor (multipart). Sends the admin token when one exists.
 * Throws an Error with a user-facing detail when the server rejects the data.
 */
export async function submitMeterCalculation(calculation) {
  const response = await apiFetch(buildApiUrl(getApiBase(), '/api/calculos-medidor'), {
    method: 'POST',
    formData: buildFormData(calculation),
    token: sessionStorage.getItem(TOKEN_STORAGE_KEY),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error del servidor: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Error al procesar los datos');
  }
  return result;
}

/** Appends to the local history (last 50) and remembers the last calculation. */
export function saveCalculationHistory(calculation) {
  try {
    const record = withoutPhotos(calculation);
    const history = readList(HISTORY_KEY);
    history.push(record);
    if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(LAST_CALCULATION_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('Error al guardar en localStorage:', error);
  }
}

/** Keeps a calculation that could not be sent in the pending queue. */
export function queuePendingCalculation(calculation) {
  try {
    const pending = readList(PENDING_SYNC_KEY);
    pending.push(withoutPhotos(calculation));
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('No se pudo guardar en localStorage:', error);
  }
}

/** Personal fields of the last calculation, used to prefill the form. */
export function loadSavedPersonalData() {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_CALCULATION_KEY));
    if (!last) return {};
    const saved = {};
    for (const field of PERSONAL_FIELDS) {
      if (last[field]) saved[field] = String(last[field]);
    }
    return saved;
  } catch (error) {
    console.error('Error al cargar datos guardados:', error);
    return {};
  }
}

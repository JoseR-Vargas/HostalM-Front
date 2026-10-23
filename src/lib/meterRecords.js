import { apiFetch } from './apiClient';
import { buildApiUrl, getApiBase } from './apiConfig';
import { filterByMonth, getRecordDate } from './dates';

// `fechaRegistro` is sent by the form; `createdAt` is set by the server.
const DATE_FIELDS = ['fechaRegistro', 'createdAt'];

/** GET /api/calculos-medidor (main backend). Sends the Bearer token when there is one. */
export async function fetchCalculos({ token, signal } = {}) {
  const response = await apiFetch(buildApiUrl(getApiBase(), '/api/calculos-medidor'), {
    token,
    signal,
  });
  if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
  const body = await response.json();
  return body.data || [];
}

/** Photo endpoint of a calculation. `kind` is `'anterior'` or `'actual'`. */
export function getCalculoFotoUrl(id, kind) {
  return buildApiUrl(getApiBase(), `/api/calculos-medidor/${id}/foto-${kind}`);
}

/** True when the server stored a photo for that reading. */
export function hasFoto(calculo, kind) {
  const data = kind === 'anterior' ? calculo.fotoAnteriorData : calculo.fotoActualData;
  return Boolean(data && data.filename);
}

/**
 * Records of the month. A record without a usable date is kept (the admin can still
 * see it) instead of being silently discarded.
 */
export function filterCalculosByMonth(calculos, monthKey) {
  return filterByMonth(calculos, monthKey, (calculo) => getRecordDate(calculo, DATE_FIELDS), {
    keepUndated: true,
  });
}

export function formatCalculoDate(calculo) {
  const date = getRecordDate(calculo, DATE_FIELDS);
  return date ? date.toLocaleDateString('es-AR') : '—';
}

export function formatDecimal1(value) {
  return Number(value).toFixed(1);
}

/** Totals shown above the table (strings already formatted with one decimal). */
export function computeCalculoMetrics(calculos) {
  const totalRegistros = calculos.length;
  const totalConsumo = calculos.reduce((sum, c) => sum + (Number(c.consumoCalculado) || 0), 0);

  return {
    totalRegistros,
    consumoTotal: totalConsumo.toFixed(1),
    promedioConsumo: totalRegistros > 0 ? (totalConsumo / totalRegistros).toFixed(1) : '0',
  };
}

import { apiFetch } from './apiClient';
import { buildApiUrl, getApiBase } from './apiConfig';
import { VOUCHER_DATE_FIELDS, filterByMonth, getRecordDate } from './dates';

const IMAGE_FILE_REGEX = /\.(jpg|jpeg|png|gif|webp)$/i;

// The "Fecha" column never read `fechaHora` (only the month grouping did).
const COLUMN_DATE_FIELDS = ['timestamp', 'createdAt'];

export function isImageFile(name) {
  return Boolean(name) && IMAGE_FILE_REGEX.test(name);
}

/** Vouchers of the month, grouped by `timestamp | createdAt | fechaHora`. Undated ones are dropped. */
export function filterVouchersByMonth(vouchers, monthKey) {
  return filterByMonth(vouchers, monthKey, (voucher) => getRecordDate(voucher, VOUCHER_DATE_FIELDS));
}

export function formatVoucherDate(voucher) {
  const date = getRecordDate(voucher, COLUMN_DATE_FIELDS);
  return date ? date.toLocaleDateString('es-AR') : '—';
}

/**
 * Files to show for a voucher, as `{ name, url? }`.
 * - Raw backend vouchers only carry `fotos` (file names): the url is built on the API base.
 * - Relative urls (`/uploads/...`) are prefixed with the API base.
 */
export function normalizeVoucherFiles(voucher, base) {
  let files = Array.isArray(voucher.files) ? voucher.files : [];

  if (files.length === 0 && Array.isArray(voucher.fotos) && voucher.fotos.length > 0) {
    files = voucher.fotos.map((name) => ({
      name,
      url: buildApiUrl(base, `/uploads/vouchers/${name}`),
    }));
  }

  return files.map((file) =>
    file.url && file.url.startsWith('/') ? { ...file, url: buildApiUrl(base, file.url) } : file,
  );
}

/**
 * GET /api/vouchers on the backend. Like the original dashboard it sends no
 * auth header and answers `{ success, data: [...] }`. Rejects when the request fails.
 */
export async function fetchVouchers({ signal } = {}) {
  const response = await apiFetch(buildApiUrl(getApiBase(), '/api/vouchers'), { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  const vouchers = body.data || body;
  return Array.isArray(vouchers) ? vouchers : [];
}

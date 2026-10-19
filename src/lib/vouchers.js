import { apiFetch } from './apiClient';
import { buildApiUrl, getVouchersBase } from './apiConfig';
import { PENDING_VOUCHERS_KEY } from './constants';
import { validateVoucherFiles } from './files';
import { validateVoucherAmount } from './money';
import { isValidEmail } from './validators';

const REF4_REGEX = /^\d{4}$/;

/** Returns every validation error in legacy order (the form shows only the first). */
export function validateVoucherForm(data, files) {
  const errors = [];
  if (!data.nombre) errors.push('El nombre es requerido');
  if (!data.apellido) errors.push('El apellido es requerido');
  if (!data.dni) errors.push('El DNI es requerido');
  if (!data.email) errors.push('El correo electrónico es requerido');
  if (data.email && !isValidEmail(data.email)) errors.push('El correo electrónico no es válido');
  if (!REF4_REGEX.test(data.ref4)) errors.push('Los últimos 4 dígitos deben ser numéricos');
  if (!data.hab) errors.push('El número de habitación/apartamento es requerido');
  errors.push(...validateVoucherAmount(data.monto));
  errors.push(...validateVoucherFiles(files));
  return errors;
}

export function buildVoucherFormData(data, files) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.append(key, value));
  formData.append('timestamp', new Date().toISOString());
  for (const file of files) formData.append('files', file, file.name);
  return formData;
}

/** POST /api/vouchers (multipart). Throws when the server answers with a non-2xx status. */
export async function sendVoucher(formData) {
  const response = await apiFetch(buildApiUrl(getVouchersBase(), '/api/vouchers'), {
    method: 'POST',
    formData,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json().catch(() => ({}));
}

/** Keeps a snapshot (without the image bytes) of a voucher that could not be sent. */
export function savePendingVoucher(data, files) {
  const snapshots = JSON.parse(localStorage.getItem(PENDING_VOUCHERS_KEY) || '[]');
  const fileSummaries = Array.from(files).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
  }));
  snapshots.push({ ...data, files: fileSummaries, timestamp: new Date().toISOString() });
  localStorage.setItem(PENDING_VOUCHERS_KEY, JSON.stringify(snapshots));
}

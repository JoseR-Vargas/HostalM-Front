import { MAX_PHOTO_BYTES, MAX_VOUCHERS_TOTAL_BYTES } from './constants';

export function isImageFile(file) {
  return file.type.startsWith('image/');
}

/** Returns an error message for an invalid meter photo, or null when valid. */
export function validateMeterPhoto(file) {
  if (!isImageFile(file)) {
    return 'Por favor seleccione un archivo de imagen válido';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'La imagen es muy grande. Por favor seleccione una imagen menor a 5MB';
  }
  return null;
}

export function getTotalSize(files) {
  let total = 0;
  for (const file of files) total += file.size;
  return total;
}

/** Validates the voucher images and returns the list of error messages. */
export function validateVoucherFiles(files) {
  const errors = [];
  if (!files || files.length === 0) {
    errors.push('Debes adjuntar al menos una imagen del comprobante');
    return errors;
  }

  let total = 0;
  for (const file of files) {
    if (!isImageFile(file)) {
      errors.push('Solo se permiten imágenes');
      break;
    }
    total += file.size;
  }
  if (total > MAX_VOUCHERS_TOTAL_BYTES) {
    errors.push('Las imágenes superan el tamaño total permitido (50 MB)');
  }
  return errors;
}

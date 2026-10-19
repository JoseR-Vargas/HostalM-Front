import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  MAX_VOUCHERS_TOTAL_BYTES,
} from './constants';
import {
  getTotalSize,
  isImageFile,
  validateMeterPhoto,
  validateVoucherFiles,
} from './files';

const fakeFile = (type, size) => ({ type, size, name: 'f' });
const MB = 1024 * 1024;

describe('limits', () => {
  it('exposes the legacy limits', () => {
    expect(MAX_PHOTO_BYTES).toBe(5 * MB);
    expect(MAX_VOUCHERS_TOTAL_BYTES).toBe(50 * MB);
  });
});

describe('isImageFile', () => {
  it('detects image mime types', () => {
    expect(isImageFile(fakeFile('image/jpeg', 1))).toBe(true);
    expect(isImageFile(fakeFile('image/png', 1))).toBe(true);
    expect(isImageFile(fakeFile('application/pdf', 1))).toBe(false);
    expect(isImageFile(fakeFile('', 1))).toBe(false);
  });
});

describe('validateMeterPhoto', () => {
  it('accepts images up to exactly 5MB', () => {
    expect(validateMeterPhoto(fakeFile('image/jpeg', 5 * MB))).toBeNull();
    expect(validateMeterPhoto(fakeFile('image/png', 10))).toBeNull();
  });

  it('rejects non images', () => {
    expect(validateMeterPhoto(fakeFile('application/pdf', 10))).toBe(
      'Por favor seleccione un archivo de imagen válido',
    );
  });

  it('rejects images over 5MB', () => {
    expect(validateMeterPhoto(fakeFile('image/jpeg', 5 * MB + 1))).toBe(
      'La imagen es muy grande. Por favor seleccione una imagen menor a 5MB',
    );
  });
});

describe('getTotalSize', () => {
  it('sums file sizes', () => {
    expect(getTotalSize([fakeFile('image/png', 10), fakeFile('image/png', 5)])).toBe(15);
    expect(getTotalSize([])).toBe(0);
  });
});

describe('validateVoucherFiles', () => {
  it('requires at least one file', () => {
    const message = 'Debes adjuntar al menos una imagen del comprobante';
    expect(validateVoucherFiles([])).toEqual([message]);
    expect(validateVoucherFiles(null)).toEqual([message]);
  });

  it('accepts images whose total is at most 50MB', () => {
    expect(validateVoucherFiles([fakeFile('image/png', 50 * MB)])).toEqual([]);
  });

  it('rejects non image files', () => {
    expect(validateVoucherFiles([fakeFile('application/pdf', 10)])).toEqual([
      'Solo se permiten imágenes',
    ]);
  });

  it('rejects totals over 50MB', () => {
    const files = [fakeFile('image/png', 30 * MB), fakeFile('image/png', 20 * MB + 1)];
    expect(validateVoucherFiles(files)).toEqual([
      'Las imágenes superan el tamaño total permitido (50 MB)',
    ]);
  });
});

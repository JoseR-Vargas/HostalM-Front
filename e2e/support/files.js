// In-memory files for `setInputFiles`. Nothing is read from disk.

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');

export function fakePng(name = 'medidor.png') {
  return { name, mimeType: 'image/png', buffer: PNG_BUFFER };
}

export function fakeTextFile(name = 'notas.txt') {
  return { name, mimeType: 'text/plain', buffer: Buffer.from('not an image') };
}

/** An "image" bigger than the 5MB per-photo limit of the meter calculator. */
export function fakeOversizedPng(name = 'gigante.png') {
  return { name, mimeType: 'image/png', buffer: Buffer.concat([PNG_BUFFER, Buffer.alloc(5 * 1024 * 1024)]) };
}

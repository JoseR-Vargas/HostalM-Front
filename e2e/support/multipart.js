/**
 * Minimal multipart/form-data parser for assertions on recorded requests.
 * Works on the raw request body (binary safe: files are only measured, never decoded).
 *
 * Returns the parts in order: `{ name, filename, contentType, value, size }`
 * (`value` is only set for text fields).
 */
export function parseMultipart(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  if (!body || !match) return [];

  const boundary = Buffer.from(`--${(match[1] ?? match[2]).trim()}`);
  const parts = [];
  let cursor = body.indexOf(boundary);

  while (cursor !== -1) {
    const start = cursor + boundary.length;
    // `--` right after the boundary marks the end of the body.
    if (body.subarray(start, start + 2).toString() === '--') break;

    const next = body.indexOf(boundary, start);
    if (next === -1) break;

    // Part = CRLF headers CRLF CRLF payload CRLF
    const part = body.subarray(start + 2, next - 2);
    const separator = part.indexOf('\r\n\r\n');
    const headerBlock = part.subarray(0, separator).toString('utf8');
    const payload = part.subarray(separator + 4);

    const disposition = /content-disposition:[^\r\n]*/i.exec(headerBlock)?.[0] ?? '';
    const name = /\bname="([^"]*)"/i.exec(disposition)?.[1];
    const filename = /\bfilename="([^"]*)"/i.exec(disposition)?.[1];
    const partType = /content-type:\s*([^\r\n]+)/i.exec(headerBlock)?.[1];

    parts.push({
      name,
      filename,
      contentType: partType,
      value: filename === undefined ? payload.toString('utf8') : undefined,
      size: payload.length,
    });
    cursor = next;
  }

  return parts;
}

/** `{ nombre: 'x', ... }` for the text fields of a parsed multipart body. */
export function textFields(parts) {
  return Object.fromEntries(
    parts.filter((part) => part.filename === undefined).map((part) => [part.name, part.value]),
  );
}

/** The file parts of a parsed multipart body. */
export function fileParts(parts) {
  return parts.filter((part) => part.filename !== undefined);
}

/**
 * Thin fetch wrapper. Returns the raw Response.
 *
 * - `json`: object sent as a JSON body
 * - `formData`: multipart body (no Content-Type, the browser sets the boundary)
 * - `token`: adds `Authorization: Bearer <token>`
 * - `timeoutMs`: aborts the request after the given time
 * - `signal`: external AbortSignal (e.g. unmount cleanup)
 */
export async function apiFetch(
  url,
  { method = 'GET', json, formData, token, headers = {}, timeoutMs, signal, cache } = {},
) {
  const controller = new AbortController();
  const finalHeaders = { ...headers };
  const init = { method, headers: finalHeaders, signal: controller.signal };

  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    init.body = JSON.stringify(json);
  } else if (formData) {
    init.body = formData;
  }
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (cache) init.cache = cache;

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }
  const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(url, init);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

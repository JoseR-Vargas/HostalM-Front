import { apiFetch } from '../lib/apiClient';
import { buildApiUrl, getApiBase } from '../lib/apiConfig';

const LOGIN_TIMEOUT_MS = 12000;
const PREWARM_TIMEOUT_MS = 4000;

function describeError(error) {
  if (error.name === 'AbortError') {
    return 'El servidor está tardando en responder. Intenta nuevamente en unos segundos.';
  }
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'No se puede conectar al servidor. Verifica tu conexión a internet.';
  }
  if (error.name === 'SyntaxError') {
    return 'Respuesta inválida del servidor';
  }
  return 'Error de conexión con el servidor';
}

/**
 * POST /api/auth/login. Never throws: resolves to
 * `{ success: true, token, user }` or `{ success: false, message }`.
 */
export async function authenticate({ email, password }) {
  // Plain `fetch` on purpose: `apiFetch` stops its timer once the headers arrive, but the login
  // timeout must also cover reading the body (a stalled body would otherwise hang the form).
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(getApiBase(), '/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, token: data.access_token, user: data.user };
    }
    return { success: false, message: data.message || 'Error de autenticación' };
  } catch (error) {
    return { success: false, message: describeError(error) };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Wakes up the (possibly cold) backend. Failures are ignored on purpose. */
export async function prewarmBackend() {
  try {
    await apiFetch(buildApiUrl(getApiBase(), '/health'), {
      timeoutMs: PREWARM_TIMEOUT_MS,
      cache: 'no-store',
    });
  } catch {
    // The login request will try again.
  }
}

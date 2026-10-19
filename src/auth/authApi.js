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
  try {
    const response = await apiFetch(buildApiUrl(getApiBase(), '/api/auth/login'), {
      method: 'POST',
      json: { email, password },
      timeoutMs: LOGIN_TIMEOUT_MS,
    });
    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, token: data.access_token, user: data.user };
    }
    return { success: false, message: data.message || 'Error de autenticación' };
  } catch (error) {
    return { success: false, message: describeError(error) };
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

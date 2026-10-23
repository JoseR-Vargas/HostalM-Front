/**
 * Single place that resolves backend hosts.
 *
 * Precedence (highest first):
 *   1. `?backend=local` or `?backend=<http(s) url>` query override
 *   2. Env variable (`VITE_API_URL` / `VITE_VOUCHERS_API_URL`)
 *   3. localhost / 127.0.0.1 -> http://localhost:3000 for everything
 *   4. Production host of each backend
 *
 * Production hosts per endpoint:
 *   - main backend (auth, /health, /api/calculos-medidor*) -> Vercel
 *   - vouchers backend (/api/vouchers, /uploads/vouchers/*) -> Render
 */
const MAIN_PRODUCTION_URL = 'https://hostal-mayelewoo-backend.vercel.app';
const VOUCHERS_PRODUCTION_URL = 'https://mayelewoo-back.onrender.com';
const LOCAL_PORT = 3000;

function stripTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

function resolveBase({ envKey, productionUrl }, { location, env }) {
  const { hostname, protocol, search } = location;

  const override = new URLSearchParams(search).get('backend');
  if (override === 'local') {
    return `${protocol}//localhost:${LOCAL_PORT}`;
  }
  if (override && /^https?:\/\//i.test(override)) {
    return stripTrailingSlash(override);
  }

  if (env[envKey]) {
    return stripTrailingSlash(env[envKey]);
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${LOCAL_PORT}`;
  }

  return productionUrl;
}

function defaultOptions() {
  return { location: window.location, env: import.meta.env };
}

/** Main backend base URL (auth, health, meter calculations). */
export function getApiBase({ location, env } = defaultOptions()) {
  return resolveBase(
    { envKey: 'VITE_API_URL', productionUrl: MAIN_PRODUCTION_URL },
    { location, env },
  );
}

/** Vouchers backend base URL (vouchers API and uploaded images). */
export function getVouchersBase({ location, env } = defaultOptions()) {
  return resolveBase(
    { envKey: 'VITE_VOUCHERS_API_URL', productionUrl: VOUCHERS_PRODUCTION_URL },
    { location, env },
  );
}

/** Joins a base URL and a path with exactly one slash between them. */
export function buildApiUrl(base, path) {
  return `${stripTrailingSlash(base)}/${path.replace(/^\//, '')}`;
}

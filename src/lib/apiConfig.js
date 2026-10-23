/**
 * Single place that resolves the backend host. There is ONE backend (Vercel) for every
 * request: auth, /health, /api/calculos-medidor*, /api/vouchers and /uploads/vouchers/*.
 *
 * Precedence (highest first):
 *   1. `?backend=local` or `?backend=<http(s) url>` query override
 *   2. `VITE_API_URL` env variable (dev only; it is baked into the bundle at build time)
 *   3. localhost / 127.0.0.1 -> http://localhost:3000
 *   4. Production default -> Vercel
 */
const PRODUCTION_URL = 'https://hostal-mayelewoo-backend.vercel.app';
const LOCAL_PORT = 3000;

function stripTrailingSlash(url) {
  return url.replace(/\/$/, '');
}

function defaultOptions() {
  return { location: window.location, env: import.meta.env };
}

/** Backend base URL for every request (auth, health, meters, vouchers and uploaded images). */
export function getApiBase({ location, env } = defaultOptions()) {
  const { hostname, protocol, search } = location;

  const override = new URLSearchParams(search).get('backend');
  if (override === 'local') {
    return `${protocol}//localhost:${LOCAL_PORT}`;
  }
  if (override && /^https?:\/\//i.test(override)) {
    return stripTrailingSlash(override);
  }

  if (env.VITE_API_URL) {
    return stripTrailingSlash(env.VITE_API_URL);
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${LOCAL_PORT}`;
  }

  return PRODUCTION_URL;
}

/** Joins a base URL and a path with exactly one slash between them. */
export function buildApiUrl(base, path) {
  return `${stripTrailingSlash(base)}/${path.replace(/^\//, '')}`;
}

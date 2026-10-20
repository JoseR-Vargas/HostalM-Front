import { PNG_BUFFER } from './files.js';
import { parseMultipart } from './multipart.js';

/**
 * Every API of the app resolves to this origin on localhost (see src/lib/apiConfig.js),
 * so one origin is enough to mock all of them.
 */
export const API_ORIGIN = 'http://localhost:3000';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

function pathMatches(pattern, path) {
  const source = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\w+/g, '[^/]+');
  return new RegExp(`^${source}$`).test(path);
}

function defaultHandlers() {
  return [
    ['GET', '/health', { json: { status: 'ok' } }],
    [
      'POST',
      '/api/auth/login',
      {
        json: {
          success: true,
          access_token: 'fake-jwt-token',
          user: { email: 'admin@example.invalid', role: 'admin' },
        },
      },
    ],
    ['GET', '/api/vouchers', { json: { success: true, data: [] } }],
    ['POST', '/api/vouchers', { json: { success: true } }],
    ['GET', '/api/calculos-medidor', { json: { success: true, data: [] } }],
    ['POST', '/api/calculos-medidor', { json: { success: true } }],
    [
      'GET',
      '/api/calculos-medidor/:id/foto-anterior',
      { body: PNG_BUFFER, contentType: 'image/png' },
    ],
    [
      'GET',
      '/api/calculos-medidor/:id/foto-actual',
      { body: PNG_BUFFER, contentType: 'image/png' },
    ],
    ['GET', '/uploads/vouchers/:name', { body: PNG_BUFFER, contentType: 'image/png' }],
  ].map(([method, path, response]) => ({ method, path, response }));
}

/**
 * Fully mocked backend + network guard for one test.
 *
 * - Every request to `API_ORIGIN` is answered here and recorded in `requests`.
 * - Requests to the app itself pass through; fonts are served locally.
 * - ANY other request (vercel.app, onrender.com, ...) is aborted and recorded in `violations`,
 *   so the test fails instead of ever reaching a real host.
 */
export class MockApi {
  constructor({ appOrigin }) {
    this.appOrigin = appOrigin;
    this.handlers = defaultHandlers();
    /** @type {Array<object>} */
    this.requests = [];
    /** @type {string[]} */
    this.violations = [];
  }

  /**
   * Overrides the response of `METHOD path` (`:param` segments allowed).
   * `response` is `{ status, json, body, contentType, headers, delayMs }` or a function
   * `(request) => response`. The latest registration wins.
   */
  on(method, path, response) {
    this.handlers.unshift({ method: method.toUpperCase(), path, response });
    return this;
  }

  /** Recorded requests for `METHOD path` (`:param` segments allowed). */
  calls(method, path) {
    return this.requests.filter(
      (request) => request.method === method.toUpperCase() && pathMatches(path, request.path),
    );
  }

  /** Registers the routes on a browser context. Order matters: the last route wins. */
  async install(context) {
    await context.route('**/*', (route) => this.guard(route));
    await context.route(
      (url) => url.origin === API_ORIGIN,
      (route) => this.handleApi(route),
    );
  }

  async guard(route) {
    const url = new URL(route.request().url());

    if (url.origin === this.appOrigin) return route.fallback();

    if (url.hostname === 'fonts.googleapis.com') {
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    }
    if (url.hostname === 'fonts.gstatic.com') {
      return route.fulfill({ status: 200, contentType: 'font/woff2', body: '' });
    }
    if (url.hostname === 'wa.me') {
      // WhatsApp redirect on mobile: a blank page stands in for the real site.
      this.requests.push({ method: 'GET', path: url.pathname, url: url.href, origin: url.origin });
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>wa.me</title>' });
    }

    this.violations.push(`${route.request().method()} ${url.href}`);
    return route.abort('blockedbyclient');
  }

  async handleApi(route) {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }

    const headers = await request.allHeaders();
    const body = request.postDataBuffer();
    const recorded = {
      method: request.method(),
      path: url.pathname,
      search: url.search,
      url: url.href,
      origin: url.origin,
      headers,
      body,
      json: headers['content-type']?.includes('application/json') && body ? JSON.parse(body.toString()) : undefined,
      multipart: headers['content-type']?.includes('multipart/form-data')
        ? parseMultipart(body, headers['content-type'])
        : undefined,
    };
    this.requests.push(recorded);

    const handler = this.handlers.find(
      (candidate) => candidate.method === recorded.method && pathMatches(candidate.path, recorded.path),
    );
    if (!handler) {
      this.violations.push(`unmocked API call: ${recorded.method} ${url.href}`);
      return route.fulfill({
        status: 404,
        headers: CORS_HEADERS,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Not mocked' }),
      });
    }

    const response = typeof handler.response === 'function' ? handler.response(recorded) : handler.response;
    if (response.delayMs) await new Promise((resolve) => setTimeout(resolve, response.delayMs));
    if (response.abort) return route.abort(response.abort);

    return route.fulfill({
      status: response.status ?? 200,
      headers: { ...CORS_HEADERS, ...response.headers },
      contentType: response.json !== undefined ? 'application/json' : response.contentType,
      body: response.json !== undefined ? JSON.stringify(response.json) : response.body,
    });
  }
}

import { describe, expect, it } from 'vitest';
import * as apiConfig from './apiConfig';
import { buildApiUrl, getApiBase } from './apiConfig';

const loc = (hostname, search = '', protocol = 'http:') => ({ hostname, search, protocol });
const PROD = 'https://hostal-mayelewoo-backend.vercel.app';

const ENDPOINTS = [
  ['login', 'POST', '/api/auth/login'],
  ['health prewarm', 'GET', '/health'],
  ['calculos GET', 'GET', '/api/calculos-medidor'],
  ['calculos POST', 'POST', '/api/calculos-medidor'],
  ['calculos foto-anterior', 'GET', '/api/calculos-medidor/42/foto-anterior'],
  ['calculos foto-actual', 'GET', '/api/calculos-medidor/42/foto-actual'],
  ['vouchers GET', 'GET', '/api/vouchers'],
  ['vouchers POST', 'POST', '/api/vouchers'],
  ['voucher image upload', 'GET', '/uploads/vouchers/comp.png'],
];

const resolveAll = (options) =>
  ENDPOINTS.map(([, , path]) => buildApiUrl(getApiBase(options), path));

describe('single backend', () => {
  it('exposes no vouchers-specific resolver', () => {
    expect(apiConfig.getVouchersBase).toBeUndefined();
  });

  it.each(ENDPOINTS)('production (%s) resolves to the Vercel host', (_name, _method, path) => {
    const options = { location: loc('hostalmayelewoo.netlify.app', '', 'https:'), env: {} };
    expect(buildApiUrl(getApiBase(options), path)).toBe(`${PROD}${path}`);
  });

  it('never resolves to Render', () => {
    const options = { location: loc('hostalmayelewoo.netlify.app', '', 'https:'), env: {} };
    for (const url of resolveAll(options)) expect(url).not.toContain('onrender');
  });

  it('ignores the removed VITE_VOUCHERS_API_URL variable', () => {
    const options = {
      location: loc('hostalmayelewoo.netlify.app', '', 'https:'),
      env: { VITE_VOUCHERS_API_URL: 'https://v.env.test' },
    };
    expect(getApiBase(options)).toBe(PROD);
  });
});

describe('local development', () => {
  it('points every endpoint to localhost:3000 on localhost', () => {
    const options = { location: loc('localhost'), env: {} };
    expect(getApiBase(options)).toBe('http://localhost:3000');
    for (const url of resolveAll(options)) expect(url.startsWith('http://localhost:3000/')).toBe(true);
  });

  it('keeps the detected hostname on 127.0.0.1 and the page protocol', () => {
    expect(getApiBase({ location: loc('127.0.0.1'), env: {} })).toBe('http://127.0.0.1:3000');
    expect(getApiBase({ location: loc('localhost', '', 'https:'), env: {} })).toBe('https://localhost:3000');
  });
});

describe('?backend override', () => {
  it('?backend=local forces localhost:3000 for every endpoint even in production', () => {
    const options = { location: loc('example.com', '?backend=local', 'https:'), env: {} };
    for (const url of resolveAll(options)) expect(url.startsWith('https://localhost:3000/')).toBe(true);
  });

  it('?backend=<url> overrides every endpoint and strips one trailing slash', () => {
    const options = { location: loc('example.com', '?backend=https://staging.example.com/'), env: {} };
    for (const url of resolveAll(options)) expect(url.startsWith('https://staging.example.com/')).toBe(true);
    expect(getApiBase(options)).toBe('https://staging.example.com');
  });

  it('ignores values that are not http(s) urls', () => {
    const options = { location: loc('example.com', '?backend=javascript:alert(1)'), env: {} };
    expect(getApiBase(options)).toBe(PROD);
  });

  it('wins over env variables', () => {
    const options = {
      location: loc('example.com', '?backend=http://override.test'),
      env: { VITE_API_URL: 'http://env.test' },
    };
    expect(getApiBase(options)).toBe('http://override.test');
  });
});

describe('env variables', () => {
  it('VITE_API_URL overrides every endpoint', () => {
    const options = { location: loc('example.com'), env: { VITE_API_URL: 'https://api.env.test/' } };
    expect(getApiBase(options)).toBe('https://api.env.test');
    for (const url of resolveAll(options)) expect(url.startsWith('https://api.env.test/')).toBe(true);
  });

  it('wins over the localhost default', () => {
    const options = { location: loc('localhost'), env: { VITE_API_URL: 'http://localhost:4000' } };
    expect(getApiBase(options)).toBe('http://localhost:4000');
  });

  it('ignores empty values', () => {
    expect(getApiBase({ location: loc('example.com'), env: { VITE_API_URL: '' } })).toBe(PROD);
  });
});

describe('buildApiUrl', () => {
  it('joins base and path without duplicating slashes', () => {
    expect(buildApiUrl('https://a.test', '/api/x')).toBe('https://a.test/api/x');
    expect(buildApiUrl('https://a.test/', '/api/x')).toBe('https://a.test/api/x');
    expect(buildApiUrl('https://a.test', 'api/x')).toBe('https://a.test/api/x');
  });
});

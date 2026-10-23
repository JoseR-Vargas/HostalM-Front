import { describe, expect, it } from 'vitest';
import {
  buildApiUrl,
  getApiBase,
  getVouchersBase,
} from './apiConfig';

const loc = (hostname, search = '', protocol = 'http:') => ({ hostname, search, protocol });
const PROD_MAIN = 'https://hostal-mayelewoo-backend.vercel.app';
const PROD_VOUCHERS = 'https://mayelewoo-back.onrender.com';

describe('production hosts', () => {
  it('uses vercel for the main backend (auth and calculos-medidor)', () => {
    expect(getApiBase({ location: loc('hostal-mayelewoo.vercel.app', '', 'https:'), env: {} })).toBe(PROD_MAIN);
  });

  it('uses render for the vouchers backend', () => {
    expect(getVouchersBase({ location: loc('hostal-mayelewoo.vercel.app', '', 'https:'), env: {} })).toBe(PROD_VOUCHERS);
  });
});

describe('local development', () => {
  it('points both backends to localhost:3000 on localhost', () => {
    const options = { location: loc('localhost'), env: {} };
    expect(getApiBase(options)).toBe('http://localhost:3000');
    expect(getVouchersBase(options)).toBe('http://localhost:3000');
  });

  it('keeps the detected hostname on 127.0.0.1 and the page protocol', () => {
    expect(getApiBase({ location: loc('127.0.0.1'), env: {} })).toBe('http://127.0.0.1:3000');
    expect(getVouchersBase({ location: loc('localhost', '', 'https:'), env: {} })).toBe('https://localhost:3000');
  });
});

describe('?backend override', () => {
  it('?backend=local forces localhost:3000 even in production', () => {
    const options = { location: loc('example.com', '?backend=local', 'https:'), env: {} };
    expect(getApiBase(options)).toBe('https://localhost:3000');
    expect(getVouchersBase(options)).toBe('https://localhost:3000');
  });

  it('?backend=<url> overrides both backends and strips one trailing slash', () => {
    const options = { location: loc('example.com', '?backend=https://staging.example.com/'), env: {} };
    expect(getApiBase(options)).toBe('https://staging.example.com');
    expect(getVouchersBase(options)).toBe('https://staging.example.com');
  });

  it('ignores values that are not http(s) urls', () => {
    const options = { location: loc('example.com', '?backend=javascript:alert(1)'), env: {} };
    expect(getApiBase(options)).toBe(PROD_MAIN);
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
  it('VITE_API_URL overrides the main backend only', () => {
    const options = { location: loc('example.com'), env: { VITE_API_URL: 'https://api.env.test/' } };
    expect(getApiBase(options)).toBe('https://api.env.test');
    expect(getVouchersBase(options)).toBe(PROD_VOUCHERS);
  });

  it('VITE_VOUCHERS_API_URL overrides the vouchers backend only', () => {
    const options = { location: loc('example.com'), env: { VITE_VOUCHERS_API_URL: 'https://v.env.test' } };
    expect(getVouchersBase(options)).toBe('https://v.env.test');
    expect(getApiBase(options)).toBe(PROD_MAIN);
  });

  it('wins over the localhost default', () => {
    const options = { location: loc('localhost'), env: { VITE_API_URL: 'http://localhost:4000' } };
    expect(getApiBase(options)).toBe('http://localhost:4000');
  });

  it('ignores empty values', () => {
    expect(getApiBase({ location: loc('example.com'), env: { VITE_API_URL: '' } })).toBe(PROD_MAIN);
  });
});

describe('buildApiUrl', () => {
  it('joins base and path without duplicating slashes', () => {
    expect(buildApiUrl('https://a.test', '/api/x')).toBe('https://a.test/api/x');
    expect(buildApiUrl('https://a.test/', '/api/x')).toBe('https://a.test/api/x');
    expect(buildApiUrl('https://a.test', 'api/x')).toBe('https://a.test/api/x');
  });
});

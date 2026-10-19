import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import AppRoutes from './routes';

const KEY = 'mayelewoo_admin_token';

function LocationProbe() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="location">{pathname + search + hash}</output>;
}

function renderAt(entry) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  );
  return screen.getByTestId('location').textContent;
}

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe('legacy URL redirects', () => {
  it.each([
    ['/index.html', '/'],
    ['/login.html', '/login'],
    ['/vouchers.html', '/vouchers'],
    ['/calculator-medidor.html', '/calculator-medidor'],
    ['/contadores-luz', '/'],
    ['/contadores-luz.html', '/'],
    ['/dashboard-luz', '/'],
    ['/dashboard-luz.html', '/'],
    ['/unknown/path', '/'],
  ])('%s -> %s', (from, to) => {
    expect(renderAt(from)).toBe(to);
  });

  it('keeps the query string and hash', () => {
    expect(renderAt('/vouchers.html?backend=local#top')).toBe('/vouchers?backend=local#top');
  });

  it.each([
    'dashboard',
    'dashboard-calculator',
    'calcular-pago',
    'comprobante-pago',
    'comprobante-servicios',
  ])('redirects /%s.html to the admin route and then to login without a token', (page) => {
    expect(renderAt(`/${page}.html`)).toBe('/login');
  });
});

describe('route access', () => {
  it.each(['/', '/login', '/vouchers', '/calculator-medidor'])('%s is public', (path) => {
    expect(renderAt(path)).toBe(path);
  });

  it.each([
    '/dashboard',
    '/dashboard-calculator',
    '/calcular-pago',
    '/comprobante-pago',
    '/comprobante-servicios',
  ])('%s requires a token', (path) => {
    expect(renderAt(path)).toBe('/login');
    cleanup();
    sessionStorage.setItem(KEY, 'abc');
    expect(renderAt(path)).toBe(path);
  });
});

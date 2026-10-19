import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from './useAuth';

const KEY = 'mayelewoo_admin_token';
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const loginResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AuthProvider', () => {
  it('starts authenticated when the token is already in sessionStorage', () => {
    sessionStorage.setItem(KEY, 'abc');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('abc');
  });

  it('stores the token on a successful login and clears it on logout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(loginResponse({ success: true, access_token: 'tok' })));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);

    let outcome;
    await act(async () => {
      outcome = await result.current.login('a@b.co', 'secret1');
    });
    expect(outcome).toEqual({ success: true });
    expect(sessionStorage.getItem(KEY)).toBe('tok');
    expect(result.current.isAuthenticated).toBe(true);

    act(() => result.current.logout());
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('does not store anything when the login fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(loginResponse({ success: false, message: 'Credenciales incorrectas' }, 401)),
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.login('a@b.co', 'bad');
    });
    expect(outcome).toEqual({ success: false, message: 'Credenciales incorrectas' });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('calls onSlow after 4.5s while the server has not answered', async () => {
    vi.useFakeTimers();
    let resolveFetch;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; })));
    const { result } = renderHook(() => useAuth(), { wrapper });
    const onSlow = vi.fn();

    let pending;
    act(() => {
      pending = result.current.login('a@b.co', 'secret1', { onSlow });
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(4400); });
    expect(onSlow).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(onSlow).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(loginResponse({ success: true, access_token: 't' }));
      await pending;
    });
  });
});

describe('ProtectedRoute', () => {
  const renderAt = () =>
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/secret']}>
          <Routes>
            <Route path="/login" element={<p>login page</p>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/secret" element={<p>secret page</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

  it('redirects to /login without a token', () => {
    renderAt();
    expect(screen.getByText('login page')).toBeTruthy();
  });

  it('renders the page with a token', () => {
    sessionStorage.setItem(KEY, 'abc');
    renderAt();
    expect(screen.getByText('secret page')).toBeTruthy();
  });
});

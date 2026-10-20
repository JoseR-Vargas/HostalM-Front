import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';

const KEY = 'mayelewoo_admin_token';

const Passthrough = ({ children }) => children;

function renderAt(entry, { strict = false } = {}) {
  const Wrapper = strict ? StrictMode : Passthrough;
  return render(
    <Wrapper>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/login" element={<p>login page</p>} />
            <Route path="/public" element={<p>public page</p>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/a" element={<Link to="/b">go to b</Link>} />
              <Route path="/b" element={<p>admin b</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </Wrapper>,
  );
}

const healthCalls = (fetchMock) => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/health'));

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProtectedRoute prewarm', () => {
  it('prewarms /health once when an admin route is entered, and not again while moving between admin routes', async () => {
    sessionStorage.setItem(KEY, 'abc');
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/a');
    await waitFor(() => expect(healthCalls(fetchMock)).toHaveLength(1));

    fireEvent.click(screen.getByText('go to b'));
    await screen.findByText('admin b');
    expect(healthCalls(fetchMock)).toHaveLength(1);
  });

  it('still prewarms only once under StrictMode double-invoked effects', async () => {
    sessionStorage.setItem(KEY, 'abc');
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/b', { strict: true });
    await screen.findByText('admin b');
    await waitFor(() => expect(healthCalls(fetchMock)).toHaveLength(1));
  });

  it('does not prewarm on public pages or when redirecting to login without a token', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/public');
    renderAt('/a');

    expect(screen.getAllByText('login page')).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores prewarm failures and still renders the admin page', async () => {
    sessionStorage.setItem(KEY, 'abc');
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/b');

    expect(await screen.findByText('admin b')).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

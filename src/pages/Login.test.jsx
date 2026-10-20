import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import Login from './Login';

const KEY = 'mayelewoo_admin_token';
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const renderLogin = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<p>dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

const submit = (container, email, password) => {
  fireEvent.change(container.querySelector('#email'), { target: { value: email } });
  fireEvent.change(container.querySelector('#password'), { target: { value: password } });
  fireEvent.submit(container.querySelector('#loginForm'));
};

const callsTo = (fetchMock, path) => fetchMock.mock.calls.filter(([url]) => url.endsWith(path));

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Login', () => {
  it('renders the markup and prewarms the backend on mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderLogin();

    expect(container.querySelector('section.login.login-page .login-card')).toBeTruthy();
    expect(container.querySelector('.login-title').textContent).toBe('Acceso Administrador');
    expect(container.querySelector('#email').getAttribute('placeholder')).toBe('admin@admin.com');
    expect(container.querySelector('#loginError').style.display).toBe('none');
    expect(container.querySelector('#loginBtn span').textContent).toBe('Iniciar Sesión');
    await waitFor(() => expect(callsTo(fetchMock, '/health')).toHaveLength(1));
  });

  it('shows client validation errors without calling the API', () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderLogin();
    const error = container.querySelector('#loginError');

    submit(container, '', '');
    expect(error.textContent).toBe('Todos los campos son obligatorios');
    expect(error.style.display).toBe('block');

    submit(container, 'bad', 'secret1');
    expect(error.textContent).toBe('Por favor ingresa un email válido');

    submit(container, 'a@b.co', '12345');
    expect(error.textContent).toBe('La contraseña debe tener al menos 6 caracteres');

    expect(callsTo(fetchMock, '/api/auth/login')).toHaveLength(0);
  });

  it('logs in, stores the token and goes to the dashboard', async () => {
    const fetchMock = vi.fn((url) =>
      Promise.resolve(url.endsWith('/health') ? json({}) : json({ success: true, access_token: 'tok' })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container, findByText } = renderLogin();

    submit(container, ' a@b.co ', 'secret1');
    expect(container.querySelector('#loginBtn').disabled).toBe(true);
    expect(container.querySelector('#loginBtn span').textContent).toBe('Iniciando sesión...');

    await findByText('dashboard page');
    expect(sessionStorage.getItem(KEY)).toBe('tok');
    const [, init] = callsTo(fetchMock, '/api/auth/login')[0];
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'secret1' });
  });

  it('shows the server message and re-enables the button when credentials are wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) =>
        Promise.resolve(
          url.endsWith('/health') ? json({}) : json({ success: false, message: 'Credenciales incorrectas' }, 401),
        ),
      ),
    );
    const { container } = renderLogin();
    submit(container, 'a@b.co', 'secret1');

    await waitFor(() => expect(container.querySelector('#loginError').textContent).toBe('Credenciales incorrectas'));
    expect(container.querySelector('#loginBtn').disabled).toBe(false);
    expect(container.querySelector('#loginBtn span').textContent).toBe('Iniciar Sesión');
    expect(container.querySelector('.loading-spinner').style.display).toBe('none');
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('shows the waiting text after 4.5s without an answer', async () => {
    vi.useFakeTimers();
    let resolveLogin;
    vi.stubGlobal(
      'fetch',
      vi.fn((url) =>
        url.endsWith('/health')
          ? Promise.resolve(json({}))
          : new Promise((resolve) => {
              resolveLogin = resolve;
            }),
      ),
    );
    const { container } = renderLogin();
    submit(container, 'a@b.co', 'secret1');

    const label = () => container.querySelector('#loginBtn span').textContent;
    expect(label()).toBe('Iniciando sesión...');
    expect(container.querySelector('.loading-spinner').style.display).toBe('inline-block');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4600);
    });
    expect(label()).toBe('Esperando respuesta del servidor...');

    await act(async () => {
      resolveLogin(json({ success: false, message: 'x' }, 401));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(label()).toBe('Iniciar Sesión');
  });

  it('redirects to the dashboard right away when already authenticated', () => {
    sessionStorage.setItem(KEY, 'abc');
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal('fetch', fetchMock);
    const { getByText } = renderLogin();
    expect(getByText('dashboard page')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

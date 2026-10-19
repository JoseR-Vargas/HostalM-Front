import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, prewarmBackend } from './authApi';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authenticate', () => {
  it('returns the token and user on success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, access_token: 'tok', user: { email: 'a@b.co' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await authenticate({ email: 'a@b.co', password: 'secret1' });

    expect(result).toEqual({ success: true, token: 'tok', user: { email: 'a@b.co' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/login$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'secret1' });
  });

  it('returns the server message on failed credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: false, message: 'Credenciales inválidas' }, 401)),
    );
    await expect(authenticate({ email: 'a@b.co', password: 'x' })).resolves.toEqual({
      success: false,
      message: 'Credenciales inválidas',
    });
  });

  it('falls back to a generic message when the server sends none', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    const result = await authenticate({ email: 'a@b.co', password: 'x' });
    expect(result).toEqual({ success: false, message: 'Error de autenticación' });
  });

  it('maps an aborted request to the slow-server message', async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const result = await authenticate({ email: 'a@b.co', password: 'x' });
    expect(result.message).toBe(
      'El servidor está tardando en responder. Intenta nuevamente en unos segundos.',
    );
  });

  it('maps a network failure to the connection message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await authenticate({ email: 'a@b.co', password: 'x' });
    expect(result.message).toBe(
      'No se puede conectar al servidor. Verifica tu conexión a internet.',
    );
  });

  it('maps an invalid JSON body to the invalid response message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    const result = await authenticate({ email: 'a@b.co', password: 'x' });
    expect(result.message).toBe('Respuesta inválida del servidor');
  });

  it('uses a generic connection message for other errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const result = await authenticate({ email: 'a@b.co', password: 'x' });
    expect(result.message).toBe('Error de conexión con el servidor');
  });
});

describe('prewarmBackend', () => {
  it('pings /health without caching and never throws', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    await prewarmBackend();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/health$/);
    expect(init.cache).toBe('no-store');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(prewarmBackend()).resolves.toBeUndefined();
  });
});

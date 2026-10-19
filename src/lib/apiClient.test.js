import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, apiJson } from './apiClient';

const okResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('apiFetch', () => {
  it('sends JSON bodies with a content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('https://a.test/x', { method: 'POST', json: { a: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://a.test/x');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('sends FormData without a content type so the browser sets the boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const formData = new FormData();
    formData.append('a', '1');

    await apiFetch('https://a.test/x', { method: 'POST', formData });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(formData);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('adds the bearer token only when given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('https://a.test/x', { token: 'abc' });
    await apiFetch('https://a.test/x');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('aborts the request after the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) =>
        new Promise((resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
      ),
    );

    const promise = apiFetch('https://a.test/x', { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});

describe('apiJson', () => {
  it('returns the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ data: [1] })));
    await expect(apiJson('https://a.test/x')).resolves.toEqual({ data: [1] });
  });

  it('throws an ApiError carrying the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse({ message: 'Nope' }, { status: 400 })),
    );
    const error = await apiJson('https://a.test/x').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('Nope');
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 502 })));
    const error = await apiJson('https://a.test/x').catch((e) => e);
    expect(error.message).toBe('Error del servidor: 502');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './apiClient';

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

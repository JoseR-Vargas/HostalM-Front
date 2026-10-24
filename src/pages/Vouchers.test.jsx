import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Vouchers from './Vouchers';

const fields = {
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  email: 'ana@example.com',
  ref4: '1234',
  hab: '5',
  monto: '50.000',
};
const image = (name = 'a.png', size = 10) => {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <Vouchers />
    </MemoryRouter>,
  );

// The photos go through the real Preline/Dropzone component: wait for it to load, then use its hidden file input.
const previews = (container) => container.querySelectorAll('[data-hs-file-upload-previews] > *');
const selectFiles = async (container, files) => {
  await waitFor(() => expect(container.querySelector('[data-hs-file-upload]').dataset.ready).toBe('true'));
  fireEvent.change(container.querySelector('.dz-hidden-input'), { target: { files } });
};
const fillForm = async (container, overrides = {}, files = [image()]) => {
  for (const [id, value] of Object.entries({ ...fields, ...overrides })) {
    fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  }
  if (files) await selectFiles(container, files);
};
const submit = (container) => fireEvent.submit(container.querySelector('#voucherForm'));
const FAILURE_MESSAGE = 'No se pudo enviar el comprobante. Revisá tu conexión e intentá nuevamente.';
const banner = (container) => container.querySelector('.voucher-banner');

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Vouchers', () => {
  it('renders the form', async () => {
    const { container, getByText } = renderPage();
    expect(getByText('Carga de Comprobante')).toBeTruthy();
    expect(container.querySelector('form#voucherForm.contact-form').hasAttribute('novalidate')).toBe(true);
    expect(getByText('Fotos del comprobante (galería)*')).toBeTruthy();
    expect(container.querySelector('#fotos').getAttribute('aria-describedby')).toBe('fotosHelp');
    expect(container.querySelector('#fotosHelp')).toBeTruthy();
    await waitFor(() => expect(container.querySelector('.dz-hidden-input')).toBeTruthy());
    expect(container.querySelector('.dz-hidden-input').multiple).toBe(true);
    expect(container.querySelector('.dz-hidden-input').getAttribute('accept')).toBe('image/*');
    expect(container.querySelector('#submitBtn').textContent).toBe('Enviar Voucher');
    expect(container.querySelector('footer')).toBeTruthy();
  });

  it('strips non-digits from ref4 (max 4) and invalid characters from the amount', () => {
    const { container } = renderPage();
    fireEvent.change(container.querySelector('#ref4'), { target: { value: '12a3456' } });
    expect(container.querySelector('#ref4').value).toBe('1234');
    fireEvent.change(container.querySelector('#monto'), { target: { value: '1a0.0b00,5$' } });
    expect(container.querySelector('#monto').value).toBe('10.000,5');
  });

  it('shows only the first validation error in an error banner and sends nothing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    await fillForm(container, { nombre: '', ref4: '12' });
    submit(container);

    expect(banner(container).textContent).toBe('El nombre es requerido');
    expect(banner(container).dataset.tone).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
  });

  it('requires at least one image', async () => {
    const { container } = renderPage();
    await fillForm(container, {}, null);
    submit(container);
    expect(banner(container).textContent).toBe('Debes adjuntar al menos una imagen del comprobante');
  });

  it('rejects a selection above 50MB immediately and clears the selected files', async () => {
    const { container } = renderPage();
    const big = 30 * 1024 * 1024;
    await selectFiles(container, [image('a', big), image('b', big)]);
    await waitFor(() =>
      expect(banner(container)?.textContent).toBe(
        'Las imágenes superan 50 MB en total. Por favor, selecciona menos imágenes.',
      ),
    );
    expect(banner(container).dataset.tone).toBe('error');
    await waitFor(() => expect(previews(container)).toHaveLength(0));
  });

  it('keeps a selection that adds up to exactly 50MB', async () => {
    const { container } = renderPage();
    await selectFiles(container, [image('a', 25 * 1024 * 1024), image('b', 25 * 1024 * 1024)]);
    await waitFor(() => expect(previews(container)).toHaveLength(2));
    expect(banner(container)).toBeNull();
  });

  it('flags a non-image as soon as it is selected and never sends it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    const text = new File(['x'], 'notas.txt', { type: 'text/plain' });
    await fillForm(container, {}, [image('a.png'), text]);

    await waitFor(() => expect(banner(container)?.textContent).toBe('Solo se permiten imágenes'));
    expect(previews(container)).toHaveLength(2);

    submit(container);
    expect(banner(container).textContent).toBe('Solo se permiten imágenes');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only the remaining photos after the user removes one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    await fillForm(container, {}, [image('a.png'), image('b.png'), image('c.png')]);
    await waitFor(() => expect(previews(container)).toHaveLength(3));

    fireEvent.click(previews(container)[1].querySelector('[data-hs-file-upload-remove]'));
    expect(previews(container)).toHaveLength(2);
    submit(container);

    await waitFor(() => expect(banner(container)?.textContent).toBe('¡Voucher enviado correctamente!'));
    expect(fetchMock.mock.calls[0][1].body.getAll('files').map((f) => f.name)).toEqual(['a.png', 'c.png']);
  });

  it('POSTs the multipart payload and shows the success banner, then resets the form', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    await fillForm(container, {}, [image('a.png'), image('b.png')]);
    submit(container);

    expect(container.querySelector('#submitBtn').textContent).toBe('Procesando...');
    expect(container.querySelector('#submitBtn').disabled).toBe(true);
    await waitFor(() => expect(banner(container)?.textContent).toBe('¡Voucher enviado correctamente!'));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/vouchers');
    expect(init.method).toBe('POST');
    expect([...init.body.keys()]).toEqual([
      'nombre', 'apellido', 'dni', 'email', 'ref4', 'hab', 'monto', 'timestamp', 'files', 'files',
    ]);
    expect(init.body.getAll('files').map((f) => f.name)).toEqual(['a.png', 'b.png']);
    expect(banner(container).dataset.tone).toBe('success');
    expect(container.querySelector('#nombre').value).toBe('');
    expect(previews(container)).toHaveLength(0);
    expect(container.querySelector('#submitBtn').textContent).toBe('Enviar Voucher');
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
    expect(localStorage.getItem('pendingVouchers')).toBeNull();
  });

  it('on a server error shows an honest error banner, keeps the form and stores nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    const { container } = renderPage();
    await fillForm(container);
    submit(container);

    await waitFor(() => expect(banner(container)?.textContent).toBe(FAILURE_MESSAGE));
    expect(banner(container).dataset.tone).toBe('error');
    expect(banner(container).textContent).not.toMatch(/correctamente|Guardado/);
    expect(container.querySelector('#nombre').value).toBe('Ana');
    expect(container.querySelector('#monto').value).toBe('50.000');
    expect(previews(container)).toHaveLength(1);
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
    expect(localStorage.getItem('pendingVouchers')).toBeNull();
  });

  it('shows the same error when the network is down and lets the user retry with the same data', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    await fillForm(container);
    submit(container);
    await waitFor(() => expect(banner(container)?.textContent).toBe(FAILURE_MESSAGE));
    expect(previews(container)).toHaveLength(1);
    expect(localStorage.getItem('pendingVouchers')).toBeNull();

    submit(container);
    await waitFor(() => expect(banner(container)?.textContent).toBe('¡Voucher enviado correctamente!'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].body.get('nombre')).toBe('Ana');
    expect(fetchMock.mock.calls[1][1].body.getAll('files').map((f) => f.name)).toEqual(['a.png']);
    expect(container.querySelector('#nombre').value).toBe('');
  });

  it('trims the text fields before validating and sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    await fillForm(container, { nombre: '  Ana  ' });
    submit(container);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].body.get('nombre')).toBe('Ana');
  });
});

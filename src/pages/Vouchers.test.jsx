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

const fillForm = (container, overrides = {}, files = [image()]) => {
  for (const [id, value] of Object.entries({ ...fields, ...overrides })) {
    fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  }
  if (files) fireEvent.change(container.querySelector('#fotos'), { target: { files } });
};
const submit = (container) => fireEvent.submit(container.querySelector('#voucherForm'));
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
  it('renders the form', () => {
    const { container, getByText } = renderPage();
    expect(getByText('Carga de Comprobante')).toBeTruthy();
    expect(container.querySelector('form#voucherForm.contact-form').hasAttribute('novalidate')).toBe(true);
    expect(container.querySelector('#fotos').multiple).toBe(true);
    expect(container.querySelector('#fotos').getAttribute('accept')).toBe('image/*');
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

  it('shows only the first validation error in an error banner and sends nothing', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    fillForm(container, { nombre: '', ref4: '12' });
    submit(container);

    expect(banner(container).textContent).toBe('El nombre es requerido');
    expect(banner(container).style.backgroundColor).toBe('rgb(254, 215, 215)');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
  });

  it('requires at least one image', () => {
    const { container } = renderPage();
    fillForm(container, {}, null);
    submit(container);
    expect(banner(container).textContent).toBe('Debes adjuntar al menos una imagen del comprobante');
  });

  it('rejects a selection above 50MB immediately and clears the input', () => {
    const { container } = renderPage();
    const big = 30 * 1024 * 1024;
    fireEvent.change(container.querySelector('#fotos'), { target: { files: [image('a', big), image('b', big)] } });
    expect(banner(container).textContent).toBe(
      'Las imágenes superan 50 MB en total. Por favor, selecciona menos imágenes.',
    );
    expect(container.querySelector('#fotos').value).toBe('');
  });

  it('POSTs the multipart payload and shows the success banner, then resets the form', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    fillForm(container, {}, [image('a.png'), image('b.png')]);
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
    expect(banner(container).style.backgroundColor).toBe('rgb(198, 246, 213)');
    expect(container.querySelector('#nombre').value).toBe('');
    expect(container.querySelector('#submitBtn').textContent).toBe('Enviar Voucher');
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
    expect(localStorage.getItem('pendingVouchers')).toBeNull();
  });

  it('on failure saves locally and shows the success banner without resetting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    const { container } = renderPage();
    fillForm(container);
    submit(container);

    await waitFor(() =>
      expect(banner(container)?.textContent).toBe(
        'Guardado localmente. Se enviará cuando el backend esté disponible.',
      ),
    );
    const stored = JSON.parse(localStorage.getItem('pendingVouchers'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ nombre: 'Ana', monto: '50.000', files: [{ name: 'a.png' }] });
    expect(banner(container).style.backgroundColor).toBe('rgb(198, 246, 213)');
    expect(container.querySelector('#nombre').value).toBe('Ana');
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
  });

  it('saves locally when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { container } = renderPage();
    fillForm(container);
    submit(container);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('pendingVouchers'))).toHaveLength(1));
  });

  it('trims the text fields before validating and sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    fillForm(container, { nombre: '  Ana  ' });
    submit(container);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].body.get('nombre')).toBe('Ana');
  });
});

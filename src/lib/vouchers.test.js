import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildVoucherFormData, sendVoucher, validateVoucherForm } from './vouchers';

const data = {
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

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('validateVoucherForm', () => {
  it('accepts a complete form', () => {
    expect(validateVoucherForm(data, [image()])).toEqual([]);
  });

  it('reports required fields in the form order', () => {
    const empty = { nombre: '', apellido: '', dni: '', email: '', ref4: '', hab: '', monto: '' };
    expect(validateVoucherForm(empty, [])).toEqual([
      'El nombre es requerido',
      'El apellido es requerido',
      'El DNI es requerido',
      'El correo electrónico es requerido',
      'Los últimos 4 dígitos deben ser numéricos',
      'El número de habitación/apartamento es requerido',
      'El monto depositado es requerido',
      'Debes adjuntar al menos una imagen del comprobante',
    ]);
  });

  it('rejects invalid email and ref4 that is not exactly 4 digits', () => {
    expect(validateVoucherForm({ ...data, email: 'bad', ref4: '12a4' }, [image()])).toEqual([
      'El correo electrónico no es válido',
      'Los últimos 4 dígitos deben ser numéricos',
    ]);
    expect(validateVoucherForm({ ...data, ref4: '123' }, [image()])).toHaveLength(1);
  });

  it('flags amounts below 1.000 and amounts without thousands separators', () => {
    expect(validateVoucherForm({ ...data, monto: '999' }, [image()])).toEqual([
      'Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)',
    ]);
    expect(validateVoucherForm({ ...data, monto: '50000' }, [image()])).toEqual([
      'El monto debe estar en formato correcto con separador de miles. Ejemplo: 1.000, 10.000, 20.000',
    ]);
  });

  it('rejects 500,50 (500.5) as below the minimum and accepts 1.000,50', () => {
    expect(validateVoucherForm({ ...data, monto: '500,50' }, [image()])).toEqual([
      'Por favor, coloque el monto completo (ejemplo: 50.000, 100.000, 200.000)',
    ]);
    expect(validateVoucherForm({ ...data, monto: '1.000,50' }, [image()])).toEqual([]);
  });

  it('rejects non-image files and uploads above 50MB in total', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(validateVoucherForm(data, [pdf])).toEqual(['Solo se permiten imágenes']);
    const big = 30 * 1024 * 1024;
    expect(validateVoucherForm(data, [image('a', big), image('b', big)])).toEqual([
      'Las imágenes superan el tamaño total permitido (50 MB)',
    ]);
  });
});

describe('buildVoucherFormData', () => {
  it('appends the fields, a timestamp and one `files` entry per image', () => {
    const form = buildVoucherFormData(data, [image('a.png'), image('b.png')]);
    expect([...form.keys()]).toEqual([
      'nombre', 'apellido', 'dni', 'email', 'ref4', 'hab', 'monto', 'timestamp', 'files', 'files',
    ]);
    expect(form.get('monto')).toBe('50.000');
    expect(Number.isNaN(Date.parse(form.get('timestamp')))).toBe(false);
    expect(form.getAll('files').map((f) => f.name)).toEqual(['a.png', 'b.png']);
  });
});

describe('sendVoucher', () => {
  const okResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

  it('POSTs multipart data to the vouchers backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const body = buildVoucherFormData(data, [image()]);

    await expect(sendVoucher(body)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/vouchers');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(body);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('tolerates a non-JSON success body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('created', { status: 201 })));
    await expect(sendVoucher(new FormData())).resolves.toEqual({});
  });

  it('throws on a non-2xx status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({}, 500)));
    await expect(sendVoucher(new FormData())).rejects.toThrow('HTTP 500');
  });
});

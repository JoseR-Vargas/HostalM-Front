import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMeterCalculation,
  getConsumptionPreview,
  loadSavedPersonalData,
  queuePendingCalculation,
  saveCalculationHistory,
  submitMeterCalculation,
  validateMeterForm,
} from './meterCalculations';

const values = {
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  habitacion: 'Hab 5',
  medicionAnterior: '3565.3',
  medicionActual: '3625,2',
};
const photos = { hasAnterior: true, hasActual: true };
const photoFile = (name) => new File(['x'], name, { type: 'image/png' });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('validateMeterForm', () => {
  it('accepts a complete form', () => {
    expect(validateMeterForm(values, photos)).toEqual({});
  });

  it('requires every field and both photos', () => {
    const empty = { nombre: '', apellido: '', dni: '', habitacion: '', medicionAnterior: '', medicionActual: '' };
    expect(validateMeterForm(empty, { hasAnterior: false, hasActual: false })).toEqual({
      nombre: 'Este campo es requerido',
      apellido: 'Este campo es requerido',
      dni: 'Este campo es requerido',
      habitacion: 'Este campo es requerido',
      medicionAnterior: 'Este campo es requerido',
      medicionActual: 'Este campo es requerido',
      fotoAnterior: 'Debe cargar la foto del medidor del mes anterior',
      fotoActual: 'Debe cargar la foto del medidor del mes actual',
    });
  });

  it('rejects readings without a decimal separator (normalization only applies to the preview)', () => {
    const errors = validateMeterForm({ ...values, medicionAnterior: '35659' }, photos);
    expect(errors.medicionAnterior).toBe(
      'Formato requerido: número con punto o coma decimal (Ej: 408.7 o 0035,3)',
    );
  });

  it('requires a DNI of 7-8 digits', () => {
    expect(validateMeterForm({ ...values, dni: '123456' }, photos).dni).toBe(
      'Ingrese un DNI válido (7-8 dígitos)',
    );
    expect(validateMeterForm({ ...values, dni: '123456789' }, photos).dni).toBe(
      'Ingrese un DNI válido (7-8 dígitos)',
    );
    expect(validateMeterForm({ ...values, dni: '1234567' }, photos).dni).toBeUndefined();
  });

  it('requires the current reading to be greater than the previous one', () => {
    const errors = validateMeterForm({ ...values, medicionActual: '3565,3' }, photos);
    expect(errors.medicionActual).toBe('La medición actual debe ser mayor a la anterior');
  });
});

describe('getConsumptionPreview', () => {
  it('returns the consumption when current > previous, using normalized readings', () => {
    expect(getConsumptionPreview('3565.3', '3625,2')).toBeCloseTo(59.9, 5);
    expect(getConsumptionPreview('35653', '36252')).toBeCloseTo(59.9, 5);
  });

  it('returns null when the readings do not allow a calculation', () => {
    expect(getConsumptionPreview('', '10.5')).toBeNull();
    expect(getConsumptionPreview('10.5', '10.5')).toBeNull();
    expect(getConsumptionPreview('20.5', '10.5')).toBeNull();
  });
});

describe('buildMeterCalculation', () => {
  it('parses the normalized readings and prices the consumption', () => {
    const calc = buildMeterCalculation(
      { ...values, nombre: ' Ana ', habitacion: ' Hab 5 ', medicionAnterior: '100.0', medicionActual: '110,5' },
      { fotoAnterior: photoFile('a.png'), fotoActual: photoFile('b.png') },
      new Date('2026-10-19T10:00:00.000Z'),
    );
    expect(calc).toMatchObject({
      nombre: 'Ana',
      habitacion: 'Hab 5',
      dni: '30111222',
      medicionAnterior: 100,
      medicionActual: 110.5,
      consumoCalculado: 10.5,
      montoTotal: 10.5 * 439.26,
      precioKWH: 439.26,
      fechaRegistro: '2026-10-19T10:00:00.000Z',
      timestamp: new Date('2026-10-19T10:00:00.000Z').getTime(),
    });
    expect(calc.fotoAnterior.name).toBe('a.png');
  });
});

describe('submitMeterCalculation', () => {
  const calc = () =>
    buildMeterCalculation(values, { fotoAnterior: photoFile('a.png'), fotoActual: photoFile('b.png') });
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

  it('POSTs multipart data to the main backend without a token by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    await submitMeterCalculation(calc());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/calculos-medidor');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBeUndefined();
    expect([...init.body.keys()]).toEqual([
      'nombre', 'apellido', 'dni', 'habitacion', 'medicionAnterior', 'medicionActual',
      'consumoCalculado', 'montoTotal', 'precioKWH', 'fechaRegistro', 'timestamp',
      'fotoAnterior', 'fotoActual',
    ]);
    expect(init.body.get('medicionActual')).toBe('3625.2');
  });

  it('adds the Bearer token when the admin is logged in', async () => {
    sessionStorage.setItem('mayelewoo_admin_token', 'tok');
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    await submitMeterCalculation(calc());

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('throws the server message on a non-2xx status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Datos inválidos' }, 400)));
    await expect(submitMeterCalculation(calc())).rejects.toThrow('Datos inválidos');
  });

  it('falls back to "Error desconocido" when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 502 })));
    await expect(submitMeterCalculation(calc())).rejects.toThrow('Error desconocido');
  });

  it('throws when the body does not report success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false, message: 'Nope' })));
    await expect(submitMeterCalculation(calc())).rejects.toThrow('Nope');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false })));
    await expect(submitMeterCalculation(calc())).rejects.toThrow('Error al procesar los datos');
  });
});

describe('local persistence', () => {
  const calc = (timestamp = 1) => ({
    ...buildMeterCalculation(values, { fotoAnterior: photoFile('a.png'), fotoActual: photoFile('b.png') }),
    timestamp,
  });

  it('saves history without photos and remembers the last calculation', () => {
    saveCalculationHistory(calc(7));
    const history = JSON.parse(localStorage.getItem('meterCalculations'));
    expect(history).toHaveLength(1);
    expect(history[0].fotoAnterior).toBeUndefined();
    expect(history[0].timestamp).toBe(7);
    expect(JSON.parse(localStorage.getItem('lastCalculation')).nombre).toBe('Ana');
  });

  it('keeps only the last 50 history entries', () => {
    for (let i = 1; i <= 52; i += 1) saveCalculationHistory(calc(i));
    const history = JSON.parse(localStorage.getItem('meterCalculations'));
    expect(history).toHaveLength(50);
    expect(history[0].timestamp).toBe(3);
    expect(history[49].timestamp).toBe(52);
  });

  it('queues failed submissions in pendingSyncCalculations without photos', () => {
    queuePendingCalculation(calc(1));
    queuePendingCalculation(calc(2));
    const pending = JSON.parse(localStorage.getItem('pendingSyncCalculations'));
    expect(pending.map((item) => item.timestamp)).toEqual([1, 2]);
    expect(pending[0].fotoActual).toBeUndefined();
  });

  it('loads only the personal fields from the last calculation', () => {
    expect(loadSavedPersonalData()).toEqual({});
    saveCalculationHistory(calc());
    expect(loadSavedPersonalData()).toEqual({
      nombre: 'Ana',
      apellido: 'Pérez',
      dni: '30111222',
      habitacion: 'Hab 5',
    });
  });

  it('ignores corrupted stored data', () => {
    localStorage.setItem('lastCalculation', '{not json');
    expect(loadSavedPersonalData()).toEqual({});
  });
});

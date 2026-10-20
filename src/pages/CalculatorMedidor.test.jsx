import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalculatorMedidor from './CalculatorMedidor';

const values = {
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  habitacion: 'Hab 5',
  medicionAnterior: '100.0',
  medicionActual: '110,5',
};
const png = (name = 'a.png', size = 10) => {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

const renderPage = () =>
  render(
    <MemoryRouter>
      <CalculatorMedidor />
    </MemoryRouter>,
  );

const fillValues = (container, overrides = {}) => {
  for (const [id, value] of Object.entries({ ...values, ...overrides })) {
    fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  }
};
const pickPhotos = (container) => {
  fireEvent.change(container.querySelector('#fotoAnterior'), { target: { files: [png('ant.png')] } });
  fireEvent.change(container.querySelector('#fotoActual'), { target: { files: [png('act.png')] } });
};
const submit = (container) => fireEvent.submit(container.querySelector('#calculatorForm'));
const errorOf = (container, id) =>
  container.querySelector(`#${id}`).closest('.form-group').querySelector('.error-message')?.textContent;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.alert = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.style.overflow = '';
});

describe('CalculatorMedidor', () => {
  it('renders the form with the logo-only header', () => {
    const { container, getByText } = renderPage();
    expect(container.querySelector('header.header a.logo').getAttribute('href')).toBe('/');
    expect(getByText('Calculadora de Medidor')).toBeTruthy();
    expect(container.querySelector('#dni').getAttribute('type')).toBe('number');
    expect(container.querySelector('#calculationPreview').classList.contains('show')).toBe(false);
    expect(container.querySelector('#resultModal').classList.contains('show')).toBe(false);
  });

  it('autofills only the personal data from the last calculation', () => {
    localStorage.setItem(
      'lastCalculation',
      JSON.stringify({ ...values, medicionAnterior: 1, medicionActual: 2 }),
    );
    const { container } = renderPage();
    expect(container.querySelector('#nombre').value).toBe('Ana');
    expect(container.querySelector('#habitacion').value).toBe('Hab 5');
    expect(container.querySelector('#medicionAnterior').value).toBe('');
  });

  it('sanitizes the reading inputs and shows the consumption preview with one decimal', () => {
    const { container } = renderPage();
    fireEvent.change(container.querySelector('#medicionAnterior'), { target: { value: '1a0,0.5' } });
    expect(container.querySelector('#medicionAnterior').value).toBe('10,05');

    fillValues(container);
    const preview = container.querySelector('#calculationPreview');
    expect(preview.classList.contains('show')).toBe(true);
    expect(container.querySelector('#consumoCalculado').textContent).toBe('10.5 kWh');

    fillValues(container, { medicionActual: '90.0' });
    expect(preview.classList.contains('show')).toBe(false);
  });

  it('normalizes the reading on blur and flags a bad format', () => {
    const { container } = renderPage();
    const anterior = container.querySelector('#medicionAnterior');
    fireEvent.change(anterior, { target: { value: '3565,9' } });
    fireEvent.blur(anterior);
    expect(anterior.value).toBe('3565.9');

    fireEvent.change(anterior, { target: { value: '35659' } });
    fireEvent.blur(anterior);
    expect(errorOf(container, 'medicionAnterior')).toBe(
      'Formato requerido: número con punto o coma decimal (Ej: 408.7 o 0035,3)',
    );
    expect(anterior.closest('.form-group').classList.contains('error')).toBe(true);
    fireEvent.change(anterior, { target: { value: '3565,9' } });
    fireEvent.blur(anterior);
    expect(anterior.closest('.form-group').classList.contains('error')).toBe(false);
  });

  it('validates the DNI while typing', () => {
    const { container } = renderPage();
    const dni = container.querySelector('#dni');
    fireEvent.change(dni, { target: { value: '12345' } });
    expect(errorOf(container, 'dni')).toBe('Ingrese un DNI válido (7-8 dígitos)');
    fireEvent.change(dni, { target: { value: '1234567' } });
    expect(dni.closest('.form-group').classList.contains('error')).toBe(false);
  });

  it('toggles capture=environment between camera and gallery', () => {
    const { container } = renderPage();
    const input = container.querySelector('#fotoAnterior');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    const [camera, gallery] = container.querySelectorAll('#fotoAnteriorGroup .upload-btn');

    fireEvent.click(camera);
    expect(input.getAttribute('capture')).toBe('environment');
    fireEvent.click(gallery);
    expect(input.hasAttribute('capture')).toBe(false);
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('previews a valid photo and rejects invalid ones with an alert', async () => {
    const { container } = renderPage();
    fireEvent.change(container.querySelector('#fotoAnterior'), { target: { files: [png()] } });
    await waitFor(() =>
      expect(container.querySelector('#fotoAnteriorGroup').classList.contains('has-photo')).toBe(true),
    );
    expect(container.querySelector('#fotoAnteriorPreview').getAttribute('src')).toMatch(/^data:/);

    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('#fotoActual'), { target: { files: [pdf] } });
    expect(window.alert).toHaveBeenCalledWith('Por favor seleccione un archivo de imagen válido');

    fireEvent.change(container.querySelector('#fotoActual'), {
      target: { files: [png('big.png', 6 * 1024 * 1024)] },
    });
    expect(window.alert).toHaveBeenCalledWith(
      'La imagen es muy grande. Por favor seleccione una imagen menor a 5MB',
    );
    expect(container.querySelector('#fotoActualGroup').classList.contains('has-photo')).toBe(false);
  });

  it('shows field and photo errors on submit and does not call the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    submit(container);

    expect(errorOf(container, 'nombre')).toBe('Este campo es requerido');
    expect(errorOf(container, 'medicionActual')).toBe('Este campo es requerido');
    const photoError = container.querySelector('#fotoAnteriorGroup .error-message');
    expect(photoError.textContent).toBe('Debe cargar la foto del medidor del mes anterior');
    expect(container.querySelector('#fotoActualGroup .error-message').textContent).toBe(
      'Debe cargar la foto del medidor del mes actual',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags a current reading that is not greater than the previous one', () => {
    const { container } = renderPage();
    fillValues(container, { medicionActual: '100.0' });
    pickPhotos(container);
    submit(container);
    expect(errorOf(container, 'medicionActual')).toBe('La medición actual debe ser mayor a la anterior');
  });

  it('sends the calculation, shows the result modal, saves history and resets the form', async () => {
    sessionStorage.setItem('mayelewoo_admin_token', 'tok');
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    fillValues(container);
    pickPhotos(container);
    submit(container);

    expect(container.querySelector('#submitBtn').textContent).toBe('Procesando...');
    expect(container.querySelector('#submitBtn').classList.contains('processing')).toBe(true);
    await waitFor(() => expect(container.querySelector('#resultModal').classList.contains('show')).toBe(true));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/calculos-medidor');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.body.get('consumoCalculado')).toBe('10.5');
    expect(init.body.get('fotoActual').name).toBe('act.png');

    expect(container.querySelector('#modalAmount').textContent).toBe('10.5 kWh');
    expect(document.body.style.overflow).toBe('hidden');
    expect(JSON.parse(localStorage.getItem('meterCalculations'))).toHaveLength(1);
    expect(localStorage.getItem('pendingSyncCalculations')).toBeNull();
    expect(container.querySelector('#nombre').value).toBe('');
    expect(container.querySelector('#calculationPreview').classList.contains('show')).toBe(false);
    expect(container.querySelector('#fotoAnteriorGroup').classList.contains('has-photo')).toBe(false);
    expect(container.querySelector('#submitBtn').textContent).toBe('Enviar');

    fireEvent.click(container.querySelector('.close-modal'));
    expect(container.querySelector('#resultModal').classList.contains('show')).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('tells the truth when the server fails: not registered, can retry, nothing queued', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Servidor caído' }, 503)));
    const { container } = renderPage();
    fillValues(container);
    pickPhotos(container);
    submit(container);

    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    const message = window.alert.mock.calls[0][0];
    expect(message).toContain('La lectura NO fue registrada.');
    expect(message).toContain('Podés intentar nuevamente');
    expect(message).toContain('Detalle: Servidor caído');
    expect(message).not.toMatch(/sincroniz|guardado localmente/i);
    expect(localStorage.getItem('pendingSyncCalculations')).toBeNull();
    expect(localStorage.getItem('meterCalculations')).toBeNull();
    expect(container.querySelector('#resultModal').classList.contains('show')).toBe(false);
    expect(container.querySelector('#nombre').value).toBe('Ana');
    expect(container.querySelector('#submitBtn').disabled).toBe(false);
  });
});

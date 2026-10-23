import { describe, expect, it } from 'vitest';
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  buildContactMessage,
  getCounterState,
  validateContactForm,
} from './contactForm';

const valid = {
  nombre: 'Ana',
  apellido: 'Pérez',
  dni: '30111222',
  email: 'ana@example.com',
  huespedes: '2',
  tipo: 'habitacion',
  mensaje: '',
};

describe('validateContactForm', () => {
  it('accepts a complete form', () => {
    expect(validateContactForm(valid)).toEqual([]);
  });

  it('reports every missing required field, treating whitespace as empty', () => {
    const errors = validateContactForm({ ...valid, nombre: ' ', apellido: '', dni: '  ', email: '' });
    expect(errors).toEqual([
      'El nombre es requerido',
      'El apellido es requerido',
      'El DNI es requerido',
      'El correo electrónico es requerido',
    ]);
  });

  it('rejects a malformed email', () => {
    expect(validateContactForm({ ...valid, email: 'not-an-email' })).toEqual([
      'El correo electrónico no es válido',
    ]);
  });
});

describe('buildContactMessage', () => {
  it('builds the guest summary without the optional message', () => {
    expect(buildContactMessage(valid)).toBe(
      '¡Hola! Quiero hacer una consulta para Hostal Mayelewoo\n\n' +
        '*Datos del huésped:*\n' +
        '👤 Nombre: Ana Pérez\n' +
        '📋 DNI: 30111222\n' +
        '📧 Email: ana@example.com\n\n' +
        '👥 *Huéspedes:* 2\n' +
        '🏠 *Tipo de alojamiento:* Habitación\n\n' +
        'Espero su respuesta. ¡Gracias!',
    );
  });

  it('includes the additional message when present', () => {
    const message = buildContactMessage({ ...valid, tipo: 'consultar', mensaje: 'Llego tarde' });
    expect(message).toContain('🏠 *Tipo de alojamiento:* Consultar opciones disponibles\n\n');
    expect(message).toContain('💬 *Mensaje adicional:*\nLlego tarde\n\nEspero su respuesta.');
  });

  it('maps apartamento and falls back to the raw type', () => {
    expect(buildContactMessage({ ...valid, tipo: 'apartamento' })).toContain('Apartamento');
    expect(buildContactMessage({ ...valid, tipo: 'otro' })).toContain('*Tipo de alojamiento:* otro');
  });
});

describe('getCounterState', () => {
  it('warns at 80% and at the limit', () => {
    expect(CONTACT_MESSAGE_MAX_LENGTH).toBe(200);
    expect(getCounterState(0)).toBe('');
    expect(getCounterState(159)).toBe('');
    expect(getCounterState(160)).toBe('near-limit');
    expect(getCounterState(199)).toBe('near-limit');
    expect(getCounterState(200)).toBe('warning');
  });
});

import { describe, expect, it } from 'vitest';
import { isValidEmail, validateLoginCredentials } from './validators';

describe('isValidEmail', () => {
  it('accepts regular addresses', () => {
    expect(isValidEmail('admin@mayelewoo.com')).toBe(true);
    expect(isValidEmail('a.b+c@sub.example.org')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('no-at.example.com')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('a@@c.com')).toBe(false);
  });
});

describe('validateLoginCredentials', () => {
  it('returns null for valid credentials', () => {
    expect(validateLoginCredentials({ email: 'a@b.co', password: 'secret1' })).toBeNull();
  });

  it('requires both fields', () => {
    expect(validateLoginCredentials({ email: '', password: 'secret1' })).toBe('Todos los campos son obligatorios');
    expect(validateLoginCredentials({ email: 'a@b.co', password: '' })).toBe('Todos los campos son obligatorios');
  });

  it('requires a valid email', () => {
    expect(validateLoginCredentials({ email: 'nope', password: 'secret1' })).toBe(
      'Por favor ingresa un email válido',
    );
  });

  it('requires a password of at least 6 characters', () => {
    expect(validateLoginCredentials({ email: 'a@b.co', password: '12345' })).toBe(
      'La contraseña debe tener al menos 6 caracteres',
    );
    expect(validateLoginCredentials({ email: 'a@b.co', password: '123456' })).toBeNull();
  });
});

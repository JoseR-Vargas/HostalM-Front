import { describe, expect, it } from 'vitest';
import { isValidEmail } from './validators';

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

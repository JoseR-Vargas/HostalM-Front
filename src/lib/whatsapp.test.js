import { describe, expect, it } from 'vitest';
import { WHATSAPP_INFO_MESSAGE, buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('targets the hostal number with an encoded message', () => {
    expect(buildWhatsAppUrl('Hola mundo')).toBe('https://wa.me/5493516664584?text=Hola%20mundo');
  });

  it('encodes the default info message', () => {
    expect(buildWhatsAppUrl(WHATSAPP_INFO_MESSAGE)).toBe(
      `https://wa.me/5493516664584?text=${encodeURIComponent('¡Hola! Quiero información sobre Hostal Mayelewoo')}`,
    );
  });
});

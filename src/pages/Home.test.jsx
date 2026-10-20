import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/whatsapp', async (importOriginal) => ({
  ...(await importOriginal()),
  isMobileDevice: vi.fn(() => false),
  openWhatsApp: vi.fn(),
}));

import { isMobileDevice, openWhatsApp } from '../lib/whatsapp';
import Home from './Home';

const renderHome = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Home />
    </MemoryRouter>,
  );

const fill = (container, values) => {
  for (const [id, value] of Object.entries(values)) {
    fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  }
};
const complete = { nombre: 'Ana', apellido: 'Pérez', dni: '30111222', email: 'ana@example.com' };

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(isMobileDevice).mockReturnValue(false);
  vi.mocked(openWhatsApp).mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Home', () => {
  it('renders the landing sections with its copy and images', () => {
    const { container } = renderHome();
    expect(screen.getByText('Bienvenido a Hostal Mayelewoo')).toBeTruthy();
    expect(screen.getByText('Humberto Primo 3070, Córdoba, Argentina')).toBeTruthy();
    expect(container.querySelector('#inicio.hero')).toBeTruthy();
    expect(container.querySelector('#habitaciones .room-card')).toBeTruthy();
    expect(container.querySelector('#contacto form#contactForm.contact-form')).toBeTruthy();
    expect(container.querySelector('img.hero-img-1').getAttribute('src')).toBe('/img/mayelewo1.jpeg');
    expect(container.querySelector('img.hero-img-2').getAttribute('src')).toBe('/img/mayelewo2.jpeg');
    expect(container.querySelector('footer #whatsappLink')).toBeTruthy();
  });

  it('fades the cards in once they are inside the viewport', async () => {
    vi.useFakeTimers();
    const { container } = renderHome();
    const card = container.querySelector('.room-card');
    expect(card.style.opacity).toBe('0');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(card.style.opacity).toBe('1');
    expect(card.style.transform).toBe('translateY(0)');
  });

  it('updates the character counter with the 80% and 100% states', () => {
    const { container } = renderHome();
    const textarea = container.querySelector('#mensaje');
    const counter = container.querySelector('.character-counter');
    expect(textarea.getAttribute('maxlength')).toBe('200');
    expect(container.querySelector('#charCount').textContent).toBe('0');

    fireEvent.change(textarea, { target: { value: 'a'.repeat(160) } });
    expect(container.querySelector('#charCount').textContent).toBe('160');
    expect(counter.classList.contains('near-limit')).toBe(true);

    fireEvent.change(textarea, { target: { value: 'a'.repeat(200) } });
    expect(counter.classList.contains('warning')).toBe(true);
    expect(counter.classList.contains('near-limit')).toBe(false);

    fireEvent.change(textarea, { target: { value: 'a'.repeat(10) } });
    expect(counter.classList.contains('warning')).toBe(false);
    expect(counter.classList.contains('near-limit')).toBe(false);
  });

  it('renders validation errors as text and does not open WhatsApp', () => {
    const { container } = renderHome();
    fill(container, { ...complete, nombre: '   ', email: 'bad' });
    fireEvent.submit(container.querySelector('#contactForm'));

    const box = container.querySelector('.error-message');
    expect(box.textContent).toContain('Por favor corrige los siguientes errores:');
    expect([...box.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'El nombre es requerido',
      'El correo electrónico no es válido',
    ]);
    expect(openWhatsApp).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('does not interpret markup typed in the fields', () => {
    const { container } = renderHome();
    fill(container, { ...complete, nombre: '<img src=x>', apellido: ' ' });
    fireEvent.submit(container.querySelector('#contactForm'));
    expect(container.querySelector('.error-message img')).toBeNull();
  });

  it('opens WhatsApp on desktop after a 1s delay with the success banner', async () => {
    vi.useFakeTimers();
    const { container } = renderHome();
    fill(container, { ...complete, mensaje: 'Hola' });
    fireEvent.submit(container.querySelector('#contactForm'));

    expect(container.querySelector('.success-message').textContent).toContain('Te estamos redirigiendo a WhatsApp');
    expect(openWhatsApp).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(openWhatsApp).toHaveBeenCalledTimes(1);
    const url = vi.mocked(openWhatsApp).mock.calls[0][0];
    expect(url.startsWith('https://wa.me/5493516664584?text=')).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toContain('👤 Nombre: Ana Pérez');
    expect(text).toContain('💬 *Mensaje adicional:*\nHola');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(container.querySelector('.success-message')).toBeNull();
  });

  it('redirects immediately on mobile', () => {
    vi.mocked(isMobileDevice).mockReturnValue(true);
    const { container } = renderHome();
    fill(container, complete);
    fireEvent.submit(container.querySelector('#contactForm'));
    expect(openWhatsApp).toHaveBeenCalledTimes(1);
  });

  it('opens the info message from the footer WhatsApp link', () => {
    const { container } = renderHome();
    fireEvent.click(container.querySelector('#whatsappLink'));
    expect(openWhatsApp).toHaveBeenCalledWith(
      `https://wa.me/5493516664584?text=${encodeURIComponent('¡Hola! Quiero información sobre Hostal Mayelewoo')}`,
    );
  });

  it('marks required fields with an error class on blur and clears it while typing', () => {
    const { container } = renderHome();
    const email = container.querySelector('#email');
    fireEvent.blur(email);
    expect(email.classList.contains('error-field')).toBe(true);
    fireEvent.change(email, { target: { value: 'bad' } });
    fireEvent.blur(email);
    expect(email.classList.contains('error-field')).toBe(true);
    fireEvent.change(email, { target: { value: 'ana@example.com' } });
    expect(email.classList.contains('error-field')).toBe(false);
  });

  it('scrolls to the section named by the URL hash on mount', () => {
    const { container } = renderHome('/#contacto');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    const target = vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1);
    expect(target).toBe(container.querySelector('#contacto'));
  });

  it('scrolls when an in-page hash link is clicked', () => {
    const { container } = renderHome();
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    fireEvent.click(container.querySelector('.cta-button'));
    const target = vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1);
    expect(target).toBe(container.querySelector('#contacto'));
  });
});

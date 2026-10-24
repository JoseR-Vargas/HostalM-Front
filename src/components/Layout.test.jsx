import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import AdminHeader from './AdminHeader';
import Footer from './Footer';
import Modal, { ModalTitle } from './Modal';
import PublicHeader from './PublicHeader';
import { ADMIN_NAV, HOME_LINKS } from './navLinks';

const wrap = (ui) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

beforeEach(() => sessionStorage.setItem('mayelewoo_admin_token', 'abc'));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('PublicHeader', () => {
  it('renders the markup with the given links', () => {
    const { container } = wrap(<PublicHeader links={HOME_LINKS} />);
    expect(container.querySelector('header.header .container .nav h1.logo').textContent).toBe('Hostal Mayelewoo');
    const links = [...container.querySelectorAll('nav.nav-menu a.nav-link')];
    expect(links.map((a) => a.textContent)).toEqual(['Inicio', 'Medidores', 'Vouchers']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/#inicio', '/calculator-medidor', '/vouchers']);
  });

  it('renders the logo-only variant', () => {
    const { container } = wrap(<PublicHeader logoOnly />);
    const logo = container.querySelector('header.header nav.nav.nav-centered.container a.logo');
    expect(logo.textContent).toBe('Hostal Mayelewoo');
    expect(logo.getAttribute('href')).toBe('/');
    expect(container.querySelector('nav-menu, .nav-menu')).toBeNull();
  });
});

describe('AdminHeader', () => {
  it('renders the per-page nav links and a logout button', () => {
    const { container } = wrap(<AdminHeader links={ADMIN_NAV['comprobante-pago']} />);
    const links = [...container.querySelectorAll('nav.nav-menu a.nav-link')];
    expect(links.map((a) => a.textContent)).toEqual(['📋 Vouchers', '🧮 Medidor']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/dashboard', '/dashboard-calculator']);
    expect(container.querySelector('.nav.nav-centered')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar Sesión' }).classList.contains('logout-btn')).toBe(true);
  });

  it('logout clears the token and goes to /login', () => {
    wrap(<AdminHeader links={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Sesión' }));
    expect(sessionStorage.getItem('mayelewoo_admin_token')).toBeNull();
    expect(screen.getByText('login page')).toBeTruthy();
  });

  it('has the nav link sets for each admin page', () => {
    const labels = (page) => ADMIN_NAV[page].map((l) => l.label);
    expect(labels('dashboard')).toEqual(['📄 Alquiler', '💧 Servicios', '⚡ Calcular Pago', '🧮 Medidores']);
    expect(labels('dashboard-calculator')).toEqual(['📋 Vouchers', '📄 Comprobante', '💧 Servicios', '⚡ Calcular Pago']);
    expect(labels('calcular-pago')).toEqual(['📋 Vouchers', '🧮 Medidor', '📄 Comprobante']);
    expect(labels('comprobante-servicios')).toEqual(['📋 Vouchers', '🧮 Medidor', '📄 Alquiler']);
  });
});

describe('Footer', () => {
  it('minimal variant has only the copyright', () => {
    const { container } = wrap(<Footer />);
    expect(container.querySelector('footer.footer.footer-centered .container .footer-bottom p').textContent).toBe(
      '© 2024 Hostal Mayelewoo. Todos los derechos reservados.',
    );
    expect(container.querySelector('.footer-section')).toBeNull();
  });

  it('home variant has address, WhatsApp and Instagram', () => {
    const { container } = wrap(<Footer variant="home" />);
    const headings = [...container.querySelectorAll('.footer-section h4')].map((h) => h.textContent);
    expect(headings).toEqual(['Hostal Mayelewoo', 'Contacto', 'Síguenos']);
    expect(container.querySelector('#whatsappLink.contact-link.whatsapp')).not.toBeNull();
    expect(container.querySelector('a.social-link.instagram').getAttribute('target')).toBe('_blank');
  });

  it('vouchers variant links back to the home page', () => {
    const { container } = wrap(<Footer variant="vouchers" />);
    const headings = [...container.querySelectorAll('.footer-section h4')].map((h) => h.textContent);
    expect(headings).toEqual(['Hostal Mayelewoo', 'Contacto', 'Volver']);
    const hrefs = [...container.querySelectorAll('.footer-section a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/#contacto', '/#inicio']);
  });
});

describe('Modal', () => {
  it('toggles the show class and closes on backdrop click only', () => {
    let closed = 0;
    const { container, rerender } = wrap(
      <Modal id="imageModal" open={false} onBackdropClick={() => closed++}>
        <p>body</p>
      </Modal>,
    );
    const modal = container.querySelector('#imageModal');
    expect(modal.classList.contains('modal')).toBe(true);
    expect(modal.classList.contains('show')).toBe(false);

    rerender(
      <AuthProvider>
        <MemoryRouter>
          <Modal id="imageModal" open onBackdropClick={() => closed++}>
            <p>body</p>
          </Modal>
        </MemoryRouter>
      </AuthProvider>,
    );
    const shown = container.querySelector('#imageModal');
    expect(shown.classList.contains('show')).toBe(true);

    fireEvent.click(screen.getByText('body'));
    expect(closed).toBe(0);
    fireEvent.click(shown);
    expect(closed).toBe(1);
  });
});

describe('Modal recipe', () => {
  it('renders the Preline card with header, title, close button, body and footer', () => {
    let closed = 0;
    const { container } = wrap(
      <Modal
        id="m"
        open
        titleId="mTitle"
        title={<ModalTitle id="mTitle">Titulo</ModalTitle>}
        onClose={() => closed++}
        closeClassName="close-modal"
        footer={<button type="button">Aceptar</button>}
      >
        <p>cuerpo</p>
      </Modal>,
    );
    const overlay = container.querySelector('#m');

    expect(overlay.getAttribute('class')).toContain('size-full fixed top-0 inset-s-0 z-80 overflow-x-hidden overflow-y-auto transition-all');
    expect(overlay.getAttribute('aria-labelledby')).toBe('mTitle');
    expect(container.querySelector('.modal-content').getAttribute('class')).toContain(
      'flex flex-col bg-overlay border border-overlay-line shadow-2xs rounded-xl pointer-events-auto',
    );
    expect(container.querySelector('#mTitle').textContent).toBe('Titulo');
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.classList.contains('close-modal')).toBe(true);
    expect(close.querySelector('svg path')).not.toBeNull();
    expect(screen.getByText('Aceptar')).not.toBeNull();

    fireEvent.click(close);
    expect(closed).toBe(1);
  });

  it('closes with Escape only while it is open and has no close button without onClose', () => {
    let closed = 0;
    const onClose = () => closed++;
    const { rerender, container } = wrap(
      <Modal id="m" open={false} onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(0);

    rerender(
      <AuthProvider>
        <MemoryRouter>
          <Modal id="m" open onClose={onClose}>
            <p>x</p>
          </Modal>
        </MemoryRouter>
      </AuthProvider>,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(closed).toBe(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closed).toBe(1);

    rerender(
      <AuthProvider>
        <MemoryRouter>
          <Modal id="m" open>
            <p>x</p>
          </Modal>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(container.querySelector('button')).toBeNull();
  });
});


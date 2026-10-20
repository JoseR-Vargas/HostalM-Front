import { expect, test } from './support/fixtures.js';

const WHATSAPP_NUMBER = '5493516664584';

const GUEST = {
  nombre: '[TEST] Ana',
  apellido: 'Prueba',
  dni: '00000001',
  email: 'ana@example.invalid',
};

// window.open is replaced so the test sees the URL without opening a real tab.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.__opened = [];
    window.open = (url, target) => {
      window.__opened.push({ url, target });
      return null;
    };
  });
});

async function fillContactForm(page, { huespedes = '3', tipo = 'apartamento', mensaje = '', ...guest } = {}) {
  const data = { ...GUEST, ...guest };
  await page.locator('#nombre').fill(data.nombre);
  await page.locator('#apellido').fill(data.apellido);
  await page.locator('#dni').fill(data.dni);
  await page.locator('#email').fill(data.email);
  await page.locator('#huespedes').selectOption(huespedes);
  await page.locator('#tipo').selectOption(tipo);
  await page.locator('#mensaje').fill(mensaje);
  return data;
}

const openedUrls = (page) => page.evaluate(() => window.__opened.map((entry) => entry.url));

test.describe('home', () => {
  test('renders the hero, the rooms and the footer', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.hero-title')).toHaveText('Bienvenido a Hostal Mayelewoo');
    await expect(page.locator('.hero-subtitle')).toHaveText('Tu hogar en el corazón de Córdoba');
    await expect(page.locator('.hero-img')).toHaveCount(2);

    const rooms = page.locator('.room-card');
    await expect(rooms).toHaveCount(2);
    await expect(rooms.locator('.room-title')).toHaveText(['Habitaciones', 'Apartamentos']);
    await expect(rooms.first().locator('li')).toHaveText(['Baño común', 'WiFi gratuito', 'Aire acondicionado']);
    await expect(rooms.last().locator('li')).toHaveText(['Cocina equipada', 'Sala de estar', 'Balcón privado']);

    await expect(page.locator('.location-address')).toHaveText('Humberto Primo 3070, Córdoba, Argentina');
    await expect(page.locator('.nav-link')).toHaveText(['Inicio', 'Medidores', 'Vouchers']);
    await expect(page.locator('.social-link.instagram')).toHaveAttribute(
      'href',
      /instagram\.com\/hostalmayelewoo/,
    );
  });

  test('the hero images and room cards fade in', async ({ page }) => {
    await page.goto('/');

    // Hero images are above the fold: revealed shortly after load.
    await expect(page.locator('.hero-img').first()).toHaveCSS('opacity', '1');

    await page.locator('.room-card').first().scrollIntoViewIfNeeded();
    await expect(page.locator('.room-card').first()).toHaveCSS('opacity', '1');
  });

  test('the contact form opens WhatsApp with the typed data', async ({ page }) => {
    await page.goto('/');
    await fillContactForm(page, { mensaje: 'Necesito cuna para bebé' });
    await page.locator('.submit-button').click();

    await expect(page.locator('.success-message')).toContainText('¡Perfecto! Te estamos redirigiendo a WhatsApp...');

    await expect.poll(() => openedUrls(page).then((urls) => urls.length)).toBe(1);
    const [url] = await openedUrls(page);
    expect(url).toMatch(new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}\\?text=`));

    const message = decodeURIComponent(url.split('?text=')[1]);
    expect(message).toBe(
      [
        '¡Hola! Quiero hacer una consulta para Hostal Mayelewoo',
        '',
        '*Datos del huésped:*',
        '👤 Nombre: [TEST] Ana Prueba',
        '📋 DNI: 00000001',
        '📧 Email: ana@example.invalid',
        '',
        '👥 *Huéspedes:* 3',
        '🏠 *Tipo de alojamiento:* Apartamento',
        '',
        '💬 *Mensaje adicional:*',
        'Necesito cuna para bebé',
        '',
        'Espero su respuesta. ¡Gracias!',
      ].join('\n'),
    );

    // The banner goes away on its own.
    await expect(page.locator('.success-message')).toHaveCount(0, { timeout: 5000 });
  });

  test('the WhatsApp message omits the optional note when it is empty', async ({ page }) => {
    await page.goto('/');
    await fillContactForm(page, { huespedes: '5+', tipo: 'consultar' });
    await page.locator('.submit-button').click();

    await expect.poll(() => openedUrls(page).then((urls) => urls.length)).toBe(1);
    const [url] = await openedUrls(page);
    const message = decodeURIComponent(url.split('?text=')[1]);

    expect(message).toContain('👥 *Huéspedes:* 5+');
    expect(message).toContain('🏠 *Tipo de alojamiento:* Consultar opciones disponibles');
    expect(message).not.toContain('Mensaje adicional');
  });

  test('on phones WhatsApp opens in the same tab', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await fillContactForm(page, { mensaje: 'Hola desde el celular' });
    await page.locator('.submit-button').click();

    await page.waitForURL(new RegExp(`^https://wa\\.me/${WHATSAPP_NUMBER}\\?text=`));
    expect(decodeURIComponent(page.url())).toContain('Hola desde el celular');
  });

  test('the footer WhatsApp link opens the info message', async ({ page }) => {
    await page.goto('/');
    await page.locator('#whatsappLink').click();

    await expect.poll(() => openedUrls(page).then((urls) => urls.length)).toBe(1);
    const [url] = await openedUrls(page);
    expect(url.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(decodeURIComponent(url.split('?text=')[1])).toBe('¡Hola! Quiero información sobre Hostal Mayelewoo');
  });

  test('the message field stops at 200 characters and the counter changes state', async ({ page }) => {
    await page.goto('/');
    const counter = page.locator('.character-counter');
    const textarea = page.locator('#mensaje');

    await expect(page.locator('#charCount')).toHaveText('0');
    await expect(counter).not.toHaveClass(/warning|near-limit/);

    await textarea.fill('a'.repeat(100));
    await expect(page.locator('#charCount')).toHaveText('100');
    await expect(counter).not.toHaveClass(/warning|near-limit/);

    await textarea.fill('a'.repeat(160));
    await expect(counter).toHaveClass(/near-limit/);

    // Typing past the limit is ignored by the browser (maxlength).
    await textarea.fill('b'.repeat(250));
    await expect(textarea).toHaveValue('b'.repeat(200));
    await expect(page.locator('#charCount')).toHaveText('200');
    await expect(counter).toHaveClass(/warning/);
    await expect(counter).toContainText('/200 caracteres');
  });

  test('the form rejects blank fields and malformed emails without opening WhatsApp', async ({ page }) => {
    await page.goto('/');
    // Whitespace passes the browser `required` check, so the app validation runs.
    await fillContactForm(page, { nombre: '   ', email: 'a@b' });
    await page.locator('.submit-button').click();

    const errorBox = page.locator('#contactForm .error-message');
    await expect(errorBox).toHaveCount(1);
    await expect(errorBox).toContainText('Por favor corrige los siguientes errores:');
    await expect(errorBox.locator('li')).toHaveText(['El nombre es requerido', 'El correo electrónico no es válido']);

    // The box must be visible even though the global `.error-message` rule hides it by default.
    await expect(errorBox).toBeVisible();

    await page.waitForTimeout(1300); // longer than the 1s desktop redirect delay
    expect(await openedUrls(page)).toEqual([]);
    await expect(page.locator('.success-message')).toHaveCount(0);
  });

  test('a required field is highlighted on blur and cleared when it gets content', async ({ page }) => {
    await page.goto('/');
    const nombre = page.locator('#nombre');

    await nombre.focus();
    await nombre.blur();
    await expect(nombre).toHaveClass(/error-field/);

    await nombre.fill('Ana');
    await expect(nombre).not.toHaveClass(/error-field/);

    await page.locator('#email').fill('a@b');
    await page.locator('#email').blur();
    await expect(page.locator('#email')).toHaveClass(/error-field/);
  });

  test('/#contacto scrolls to the contact section', async ({ page }) => {
    await page.goto('/#contacto');

    await expect
      .poll(() => page.evaluate(() => Math.round(document.getElementById('contacto').getBoundingClientRect().top)))
      .toBeLessThanOrEqual(5);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });

  test('the "Reservar Ahora" button scrolls to the contact section', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero .cta-button').click();

    await expect
      .poll(() => page.evaluate(() => Math.round(document.getElementById('contacto').getBoundingClientRect().top)))
      .toBeLessThanOrEqual(5);
  });
});

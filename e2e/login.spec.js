import { expect, test, FAKE_TOKEN, TOKEN_KEY } from './support/fixtures.js';

const CREDENTIALS = { email: 'admin@example.invalid', password: 'TestPass!123456' };

const storedToken = (page) => page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY);

async function submitLogin(page, { email = CREDENTIALS.email, password = CREDENTIALS.password } = {}) {
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#loginBtn').click();
}

test.describe('login', () => {
  test('renders the admin login form and wakes the backend up', async ({ page, mock }) => {
    await page.goto('/login.html');

    await expect(page.locator('.login-title')).toHaveText('Acceso Administrador');
    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#loginBtn')).toHaveText('Iniciar Sesión');
    await expect(page.locator('#loginError')).toBeHidden();
    await expect(page.locator('.nav-link')).toHaveText(['Inicio']);

    await expect.poll(() => mock.calls('GET', '/health').length).toBeGreaterThan(0);
  });

  test('empty fields are stopped by the browser before any request', async ({ page, mock }) => {
    await page.goto('/login.html');
    await page.locator('#loginBtn').click();

    // The inputs are `required`: the browser blocks the submit, so the app never sees it.
    expect(await page.locator('#email').evaluate((input) => input.validity.valueMissing)).toBe(true);
    await expect(page.locator('#loginError')).toBeHidden();
    expect(mock.calls('POST', '/api/auth/login')).toHaveLength(0);
  });

  test('a malformed email shows a validation message', async ({ page, mock }) => {
    await page.goto('/login.html');
    // `a@b` satisfies the browser email check but not the app rule (needs a domain dot).
    await submitLogin(page, { email: 'a@b' });

    await expect(page.locator('#loginError')).toBeVisible();
    await expect(page.locator('#loginError')).toHaveText('Por favor ingresa un email válido');
    expect(mock.calls('POST', '/api/auth/login')).toHaveLength(0);
  });

  test('a short password shows a validation message', async ({ page, mock }) => {
    await page.goto('/login.html');
    await submitLogin(page, { password: '12345' });

    await expect(page.locator('#loginError')).toHaveText('La contraseña debe tener al menos 6 caracteres');
    expect(mock.calls('POST', '/api/auth/login')).toHaveLength(0);
  });

  test('wrong credentials show the server message and store nothing', async ({ page, mock }) => {
    mock.on('POST', '/api/auth/login', {
      status: 401,
      json: { success: false, message: 'Email o contraseña incorrectos' },
    });
    await page.goto('/login.html');
    await submitLogin(page);

    await expect(page.locator('#loginError')).toBeVisible();
    await expect(page.locator('#loginError')).toHaveText('Email o contraseña incorrectos');
    await expect(page.locator('#loginBtn')).toHaveText('Iniciar Sesión');
    await expect(page.locator('#loginBtn')).toBeEnabled();
    expect(await storedToken(page)).toBeNull();
    await expect(page).toHaveURL(/\/login(\.html)?$/);
  });

  test('a failure without a message falls back to the generic text', async ({ page, mock }) => {
    mock.on('POST', '/api/auth/login', { status: 500, json: { success: false } });
    await page.goto('/login.html');
    await submitLogin(page);

    await expect(page.locator('#loginError')).toHaveText('Error de autenticación');
  });

  test('an unreachable server shows the connection message', async ({ page, mock }) => {
    mock.on('POST', '/api/auth/login', { abort: 'failed' });
    await page.goto('/login.html');
    await submitLogin(page);

    await expect(page.locator('#loginError')).toHaveText(
      'No se puede conectar al servidor. Verifica tu conexión a internet.',
    );
    expect(await storedToken(page)).toBeNull();
  });

  test('shows the progress state while the server answers', async ({ page, mock }) => {
    mock.on('POST', '/api/auth/login', {
      delayMs: 700,
      json: { success: false, message: 'Credenciales incorrectas' },
    });
    await page.goto('/login.html');
    await submitLogin(page);

    await expect(page.locator('#loginBtn')).toBeDisabled();
    await expect(page.locator('#loginBtn span')).toHaveText('Iniciando sesión...');
    await expect(page.locator('#loginError')).toHaveText('Credenciales incorrectas');
    await expect(page.locator('#loginBtn span')).toHaveText('Iniciar Sesión');
  });

  test('a successful login stores the token and lands on the dashboard', async ({ page, mock }) => {
    mock.on('POST', '/api/auth/login', {
      json: { success: true, access_token: FAKE_TOKEN, user: { email: CREDENTIALS.email, role: 'admin' } },
    });
    await page.goto('/login.html');
    await submitLogin(page);

    await expect(page).toHaveURL(/\/dashboard(\.html)?$/);
    await expect(page.locator('.section-title')).toHaveText('Dashboard Administrativo');
    expect(await storedToken(page)).toBe(FAKE_TOKEN);

    const [login] = mock.calls('POST', '/api/auth/login');
    expect(login.origin).toBe('http://localhost:3000');
    expect(login.headers['content-type']).toContain('application/json');
    expect(login.json).toEqual({ email: CREDENTIALS.email, password: CREDENTIALS.password });
  });

  test('the email is trimmed before it is sent', async ({ page, mock }) => {
    await page.goto('/login.html');
    await submitLogin(page, { email: `  ${CREDENTIALS.email}  ` });

    await expect(page).toHaveURL(/\/dashboard(\.html)?$/);
    expect(mock.calls('POST', '/api/auth/login')[0].json.email).toBe(CREDENTIALS.email);
  });

  test('an authenticated visit to the login page goes to the dashboard', async ({ page, signIn }) => {
    await signIn();
    await page.goto('/login.html');

    await expect(page).toHaveURL(/\/dashboard(\.html)?$/);
    await expect(page.locator('.section-title')).toHaveText('Dashboard Administrativo');
  });
});

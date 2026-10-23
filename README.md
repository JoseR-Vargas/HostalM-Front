# Hostal Mayelewoo — Frontend

Aplicación web del Hostal Mayelewoo (Córdoba, Argentina): sitio público para huéspedes (contacto, envío de vouchers y calculadora de medidor de luz) y panel de administración (vouchers, medidores, cálculo de pago y comprobantes en PDF).

La interfaz está en español. El código (identificadores y comentarios) está en inglés.

## Inicio rápido

```bash
npm install
npm run dev      # http://localhost:5173
```

En `localhost` la app apunta al backend local `http://localhost:3000`.

## Stack

| Área | Herramienta |
|---|---|
| Build / dev server | Vite |
| UI | React 19 |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Rutas | React Router |
| PDF | html2pdf.js (carga diferida) |
| Tests unitarios | Vitest + Testing Library (jsdom) |
| Tests e2e | Playwright |

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente |
| `npm test` | Tests unitarios y de componentes (Vitest, una sola corrida) |
| `npm run e2e` | Tests e2e con Playwright (levanta `npm run dev` en el puerto 5173) |

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/app` | `App` y la tabla de rutas (`routes.jsx`) |
| `src/pages` | Una página por ruta (`Home`, `Login`, `Vouchers`, `Dashboard`, ...) |
| `src/components` | Primitivos de UI (`ui.jsx`), headers público/admin, `Footer`, `Modal`, tablas, plantilla de comprobantes |
| `src/lib` | Lógica sin UI: configuración de API, dinero, mediciones, validaciones, PDF |
| `src/auth` | Contexto de sesión, `ProtectedRoute` y login contra el backend |
| `src/index.css` | Único CSS: import de Tailwind, tokens (`@theme`) y variantes; ver [`STYLES_GUIDE.md`](STYLES_GUIDE.md) |
| `e2e` | Tests Playwright y mocks de la API (`e2e/support`) |
| `public/img` | Imágenes estáticas |

## Rutas

| Ruta | Página | Acceso |
|---|---|---|
| `/` | Inicio (landing y formulario de contacto) | Público |
| `/login` | Acceso administrador | Público |
| `/vouchers` | Envío de vouchers de pago | Público |
| `/calculator-medidor` | Calculadora de medidor de luz | Público |
| `/dashboard` | Vouchers recibidos | Admin |
| `/dashboard-calculator` | Registros de medidores | Admin |
| `/calcular-pago` | Calculadora de pago de electricidad | Admin |
| `/comprobante-pago` | Comprobante de alquiler (PDF) | Admin |
| `/comprobante-servicios` | Comprobante de servicios (PDF) | Admin |

- **URLs antiguas:** `/index.html` y `/<ruta>.html` (por ejemplo `/dashboard.html`) redirigen a la ruta nueva conservando `?query` y `#hash`.
- **Páginas eliminadas:** `/contadores-luz` y `/dashboard-luz` (con o sin `.html`) eran páginas huérfanas; redirigen a `/`.
- Cualquier ruta desconocida redirige a `/`.
- Las rutas Admin requieren sesión; sin token redirigen a `/login`.

## Configuración de la API

Hay **un solo backend** (Vercel) para todas las peticiones: login (`/api/auth/login`), `/health`, `/api/calculos-medidor*`, `/api/vouchers` y las imágenes `/uploads/vouchers/*`. Todo se resuelve en un solo módulo: [`src/lib/apiConfig.js`](src/lib/apiConfig.js).

Host de producción: `https://hostal-mayelewoo-backend.vercel.app`

Orden de prioridad (de mayor a menor):

1. Query `?backend=local` (usa `http://localhost:3000`) o `?backend=<url http(s)>`; aplica a todas las peticiones.
2. Variable de entorno opcional `VITE_API_URL`.
3. Si la página corre en `localhost` o `127.0.0.1`: `http://localhost:3000`.
4. Host de producción (Vercel).

> **Producción (Netlify/Vercel):** `VITE_API_URL` debe estar **sin definir**. Vite la incrusta en el bundle al momento del build, así que un `.env` local con `VITE_API_URL=http://localhost:3000` es solo para desarrollo: si se usa para generar un build de producción, ese bundle apuntaría a localhost. Ver [`.env.example`](.env.example).

> **CORS:** el backend (`src/main.ts`) permite `https://hostalmayelewoo.netlify.app`, localhost y los deploy previews / branch deploys de ese sitio (`https://<deploy>--hostalmayelewoo.netlify.app`). Otro dominio de frontend debe agregarse allí.

## Autenticación

- Login: `POST {backend principal}/api/auth/login`.
- El token se guarda en `sessionStorage` bajo la clave `mayelewoo_admin_token` (se pierde al cerrar la pestaña).
- `ProtectedRoute` solo comprueba que exista el token; el logout lo elimina. Al entrar a una ruta Admin además llama a `GET /health` una vez (precalienta el backend; sin UI, los errores se ignoran).

## Deploy (Netlify)

| Ajuste | Valor |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Rewrites | `netlify.toml` envía todas las rutas a `/index.html` (SPA) |
| Variable `VITE_API_URL` | Sin definir (ver arriba) |

`vercel.json` (mismo rewrite SPA) se conserva por si se despliega el frontend en Vercel.

## Tests e2e

- Los backends siempre están **mockeados** (`page.route`, ver `e2e/support/mock-api.js`); los tests nunca llegan a servidores reales ni de producción.
- Cualquier request a un host no mockeado se aborta y hace fallar el test.
- Los datos de prueba son ficticios (prefijo `[TEST]`).
- Para depurar: `npx playwright test --ui` o `npx playwright test e2e/login.spec.js`.

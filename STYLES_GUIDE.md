# Guía de Estilos — Hostal Mayelewoo Frontend

Los estilos usan **Tailwind CSS v4**: utilidades en el JSX, tokens de diseño en [`src/index.css`](src/index.css) y componentes pequeños que repiten el mismo markup en un solo lugar. No quedan hojas CSS por página.

## Ruta rápida

1. Los tokens (colores, sombras, gradientes, fuente, animaciones) están en `@theme` de `src/index.css`. Usalos como utilidades: `text-primary`, `bg-brand`, `shadow-card`, `animate-fade-in`.
2. Armá las pantallas con los componentes de `src/components/` (tabla de abajo) en vez de repetir clases.
3. Para cambiar el aspecto de algo compartido, editá el componente o el token, no cada página.

## Cómo se carga el CSS

| Pieza | Detalle |
|---|---|
| `src/index.css` | Único archivo CSS. Lo importa `src/main.jsx` una sola vez |
| Plugin | `@tailwindcss/vite` en `vite.config.js`; no hay `tailwind.config.js` |
| Capas | `theme` y `utilities` de Tailwind **sin Preflight** (ver abajo) + una capa `base` propia (más la de `@tailwindcss/forms`) |
| Preline | Solo como sistema de diseño CSS (sin sus plugins JS): `preline/variants.css`, `@tailwindcss/forms` y un subconjunto de sus tokens semánticos (ver Tokens) |
| Fuente | Open Sans desde Google Fonts en `index.html` (única hoja externa) |

**Sin Preflight.** Probar `@import 'tailwindcss'` (con Preflight) cambia el render de todas las páginas: borde `solid` en cada elemento, botones e inputs que heredan la fuente, otros `line-height`. Se descartó porque el sitio no puede cambiar visualmente. La capa `base` de `index.css` trae los pocos resets que el diseño necesita (`margin/padding: 0`, `box-sizing`, tipografía de `body`, `h1`–`h3`, links).

## Tokens (`@theme` en `src/index.css`)

| Grupo | Tokens |
|---|---|
| Colores | `primary`, `primary-dark`, `secondary`, `secondary-dark`, `accent` (verde), `warning` (dorado), `ink` (texto), `muted` (texto secundario), `border`, `border-light` |
| Fuente | `font-sans` (Open Sans + fallbacks del sistema) |
| Sombras | `shadow-card`, `shadow-hover`, `shadow-glow` |
| Gradientes | `bg-page`, `bg-soft`, `bg-card`, `bg-brand`, `bg-bar`, `bg-title`, `bg-band` |
| Animaciones | `animate-fade-in`, `animate-slide-in`; `animate-spin` (de Tailwind) lo usa `Spinner` |
| Tokens Preline | `primary-line`, `primary-foreground`, `primary-hover/focus/active/checked`, `foreground`, `layer*`, `surface*`, `muted-foreground(-1/-2)`, `overlay*`, `table-line`, `scrollbar-track/thumb` (tema claro de Preline) |

Cambiar un valor afecta a todo el sitio.

**Colisiones con Preline.** `theme.css` de Preline no se importa: redefine `primary`, `secondary`, `muted` y `border` con otro significado y agrega `* { border-color }`. Se conserva la marca: `primary` sigue siendo `#2b6cb0` y sus estados (`primary-hover/focus/active`) usan `#2c5282` (`primary-dark`); `secondary`, `muted` y `border` mantienen los valores propios. Tampoco se declaran `card*` ni `background*` porque chocarían con los gradientes `bg-card`/`bg-page`. Si se importa otro tema de Preline más adelante, revisá estos nombres primero.

## Variantes propias (breakpoints)

Los breakpoints del CSS original son `max-width` **inclusivos**, por eso no se usan `sm:`/`md:` de Tailwind.

| Variante | Media query | Uso |
|---|---|---|
| `tablet:` | `max-width: 768px` | `tablet:text-center`, `tablet:grid-cols-[1fr]` |
| `phone:` | `max-width: 480px` | `phone:py-[0.8rem]` |
| `short:` | `max-height: 600px` | pantallas bajas (login) |
| `hover:` | `:hover` siempre | el sitio original no esperaba un puntero con hover |

Para mobile se apila en este orden: base, `tablet:`, `phone:`.

## Componentes compartidos

| Componente | Rol |
|---|---|
| `ui.jsx` | Primitivos: `cls`, `SectionTitle`, `SectionSubtitle`, `PageHeading`, `PageSection` (sección bajo el header fijo), `Banner` (`tone` = `error`/`success`), `FormCard`, `FormRow`, `Field` (label + control + ayuda/error/unidad, receta de input Preline), `Button` (`variant` = `cta`/`submit`/`primary`/`secondary`/`link`, `size="sm"`, `processing`), `Spinner`, `TABLE_LINK` |
| `PublicHeader` / `AdminHeader` | Header fijo sobre `Header`. Links por página en `navLinks.js`; el admin agrega el botón de logout |
| `Footer` | `home`, `vouchers` o mínimo (copyright, páginas admin) |
| `Modal` | Modal estático con la receta Preline (sin JS de Preline: abre/cierra React). Props: `open`, `title`/`titleId` (`ModalTitle`), `onClose` (muestra la X y cierra con Escape), `closeClassName`, `onBackdropClick`, `footer`, `size` (`default`/`wide`), `bodyClassName` |
| `DataTable` (`Tr`, `Td`, `EmptyState`) | Tabla Preline con scroll horizontal propio (`min-w-full`, `divide-y divide-table-line`). `Td wrap` deja que el contenido largo (miniaturas, links) baje de línea; `data-label` se conserva |
| `MetricCard` / `Metric` | Tarjeta de estadística |
| `MonthPager` | Selector `← Mes Año →` de las páginas admin |
| `Reveal` | Fade-in al entrar al viewport |
| `ReceiptFields` | Campos compartidos de los dos formularios de comprobantes |
| `ReceiptTemplate` | Hoja A4 del PDF (excepción, ver abajo) |

## Convenciones

- **Clases-gancho se mantienen.** Los specs y tests seleccionan por clases como `.header`, `.nav-link`, `.cta-button`, `.submit-button`, `.form-group`, `.error-message`, `.modal`, `.modal-content`, `.contact-form`. No llevan estilos: viven junto a las utilidades. No las renombres sin actualizar `e2e/` y los tests.
- **Clases de estado solo mientras están activas.** `error`, `show` y `processing` se agregan cuando el estado aplica y se quitan después (los specs comprueban `not.toHaveClass`). El grupo de un `Field` lleva `error` solo con error; el `Modal` lleva `show` solo abierto.
- **El CSS sin capa le gana a las utilidades.** Las utilidades de Tailwind están en `@layer utilities`; cualquier CSS fuera de capa que se agregue a futuro las pisaría. Mantené todo en capas o en utilidades.
- **Los tamaños con nombre fijan `line-height`.** `text-lg`, `text-xl`… traen su propio `line-height`; para conservar el original usá valores arbitrarios (`text-[1.05rem]`) y, si hace falta, `leading-*`.
- **Valores arbitrarios para paridad.** El diseño original usa `rem`/`px` puntuales; se copian tal cual (`px-[1.2rem]`) en lugar de redondear a la escala de Tailwind.
- **`ReceiptTemplate` conserva estilos inline.** `html2canvas` (vía `html2pdf.js`) lee estilos computados de la hoja del PDF, que no debe depender de CSS global ni de clases. No la migres a Tailwind.
- **Botones Preline.** `Button` usa las recetas pill de Preline: `primary` (`bg-primary`) y `secondary` (`bg-layer`). `cta` y `submit` se mantienen por sus clases-gancho (`cta-button`, `submit-button`) y se ven como `primary`; `submit` ocupa todo el ancho. Sin Preflight, el botón agrega `font-sans` para heredar la fuente de la app.
- **Inputs Preline.** `Field` aplica la receta única de input (`rounded-full bg-layer border-layer-line focus:ring-primary-focus ...`) a `input` y `select`; el `textarea` usa `rounded-2xl` (un pill no sirve para varias líneas) y el `select` agrega `pe-9` para la flecha de `@tailwindcss/forms`. Con `error` el control suma `border-red-500!` (el `!` es necesario porque la receta fija las mismas propiedades) y el grupo lleva la clase-gancho `error`. Los `type=file` conservan su estilo propio. Sin Preflight, el control agrega `font-sans`.
- **Modales Preline.** Estructura fija: overlay (`z-80`, fondo `bg-black/50`) → contenedor `sm:max-w-lg` → tarjeta `bg-overlay` con cabecera (título + X `aria-label="Close"`), cuerpo y pie opcional. Como el overlay queda en `z-80`, el header fijo está en `z-50`: no subas ningún elemento fijo por encima de 80 salvo el overlay de carga.
- **Tablas Preline.** `DataTable` ya no convierte las filas en tarjetas en mobile: la caja hace scroll horizontal. Lleva `border-collapse` porque sin Preflight `divide-y` no dibuja las líneas entre filas, y `w-full max-w-full` para que una tabla ancha no ensanche la página. Las acciones dentro de celdas usan `Button variant="link"` o `TABLE_LINK`.
- **Botón `processing`.** `Button processing` agrega la clase `processing` y `pointer-events-none` y muestra un `Spinner` antes del contenido (sin texto para lectores de pantalla, el texto del botón ya dice "Procesando...").
- **Un solo spinner.** Usá `Spinner` (`size`, `tone`, `label`, `className`) para cualquier carga; no armes anillos con bordes a mano. Si va dentro de un texto o botón que ya dice qué carga, pasá `label={null}`.

## Cómo agregar una página

1. Crear `src/pages/MiPagina.jsx` y registrar la ruta en `src/app/routes.jsx` (las admin cuelgan de `ProtectedRoute`).
2. Estructura: header (`PublicHeader`/`AdminHeader`) → `PageSection title subtitle` → `FormCard` con `Field`/`FormRow`/`Button` (o `DataTable`) → `Footer`.
3. Si hay un patrón repetido en 2+ páginas, extraelo a `src/components/` en vez de copiar clases.
4. Agregar clases-gancho solo si un test las necesita y tests en `*.test.jsx` / `e2e/`.
5. Verificar en 375, 768 y 1280 px: sin scroll horizontal y con el header fijo sin tapar contenido.

## Mapa de páginas

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Home` | Público |
| `/login` | `Login` | Público |
| `/vouchers` | `Vouchers` | Público |
| `/calculator-medidor` | `CalculatorMedidor` | Público |
| `/dashboard` | `Dashboard` | Admin |
| `/dashboard-calculator` | `DashboardCalculator` | Admin |
| `/calcular-pago` | `CalcularPago` | Admin |
| `/comprobante-pago` | `ComprobantePago` | Admin |
| `/comprobante-servicios` | `ComprobanteServicios` | Admin |

Los PDF se generan con `html2pdf.js` (carga diferida en `src/lib/pdf.js`).

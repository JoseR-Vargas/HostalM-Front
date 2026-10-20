# Guía de Estilos y Estructura — Hostal Mayelewoo Frontend

> Referencia para cambios seguros en los estilos y componentes de la app React.
> Los estilos se heredaron tal cual de la versión estática original; el diseño visual no cambió en la migración.

## Resumen rápido

- Todo el CSS global vive en [`src/styles/styles.css`](src/styles/styles.css) y se importa **una sola vez** en [`src/main.jsx`](src/main.jsx).
- [`src/styles/home.css`](src/styles/home.css) es un complemento mínimo (`.error-field`) que importa solo la página `Home`.
- No hay CSS Modules ni CSS-in-JS: las clases son globales. Renombrar o borrar una clase afecta a todas las páginas que la usen.
- Open Sans se carga desde Google Fonts en [`index.html`](index.html) (única hoja externa).

---

## 1. Cómo se carga el CSS

| Archivo | Quién lo importa | Contenido |
|---|---|---|
| `src/styles/styles.css` | `src/main.jsx` | Variables `:root`, layout, componentes y responsive de todo el sitio |
| `src/styles/home.css` | `src/pages/Home.jsx` | `.error-field` (resalta campos del formulario de contacto que fallaron la validación on-blur) |

Para agregar estilos de una sola página, crear un archivo en `src/styles/` e importarlo desde esa página (como hace `Home`). No hace falta orden de carga manual: Vite empaqueta el CSS.

---

## 2. Variables CSS (`:root`)

Todas las páginas dependen de estas variables. **Cambiar un valor afecta a todo el sitio.**

| Variable | Valor | Uso actual |
|---|---|---|
| `--bg-primary` | gradiente blanco perlado | `body` background |
| `--bg-secondary` | gradiente gris perla claro | inputs focus, fondos secundarios |
| `--bg-card` | gradiente blanco cristal | `.contact-form`, `.metric-card`, `.table-container`, `.calculator-container` |
| `--text-primary` | `#1A202C` | texto general, headings |
| `--text-secondary` | `#4A5568` | subtítulos, labels, placeholders |
| `--color-primary` | `#2B6CB0` | botones, links, bordes activos, `.metric-value`, `.result-amount` |
| `--color-primary-dark` | `#2C5282` | hover de botones y links |
| `--color-secondary` | `#553C9A` | acentos, gradientes, `.section-subtitle` |
| `--color-secondary-dark` | `#44337A` | hover secundario |
| `--color-accent` | `#38A169` | verde — highlights, `.calculation-result` border, `.consumo-cell`, `.modal-title` |
| `--color-warning` | `#D69E2E` | dorado — `.logout-btn` |
| `--color-border` | `#E2E8F0` | bordes de cards, inputs, separadores |
| `--color-border-light` | `#CBD5E0` | bordes más visibles |
| `--font-family` | Open Sans + system fallbacks | todo el sitio |
| `--max-width` | `1200px` | `.container` |
| `--border-radius` | `12px` | cards, modales, botones CTA |
| `--border-radius-sm` | `8px` | inputs, botones pequeños |
| `--shadow` | `0 4px 24px rgba(0,0,0,0.08)` | estado normal de cards |
| `--shadow-hover` | `0 8px 32px rgba(0,0,0,0.12)` | hover de cards |
| `--shadow-glow` | `0 0 20px rgba(43,108,176,0.2)` | botón CTA, hover |
| `--transition` | `all 0.3s cubic-bezier(0.4,0,0.2,1)` | todas las transiciones |

---

---

## 3. Layout base y componentes compartidos

Cada página compone el mismo esqueleto con los componentes de `src/components/`:

```
<PublicHeader /> | <AdminHeader />      ← header fijo (.header), z-index 1000, backdrop blur
<section className="contact page-top-offset">   ← sección principal
  .container [.vouchers-center]
    ...contenido...
</section>
<Footer [variant] />                    ← footer
```

| Componente | Rol | Variantes |
|---|---|---|
| `PublicHeader` | Header público: logo + links (`links=[{to,label}]`) | `logoOnly`: logo centrado que enlaza a `/` (calculadora de medidor) |
| `AdminHeader` | Header admin: logo + links + botón de logout (`.logout-btn`) | Links por página en `src/components/navLinks.js` (`ADMIN_NAV`) |
| `Footer` | Footer del sitio | `home` (3 columnas: dirección, WhatsApp, Instagram), `vouchers` (dirección, contacto, volver), por defecto solo copyright (admin) |
| `Modal` | Overlay `.modal` + `.modal-content` reutilizable | Props: `open`, `onBackdropClick`, `contentClassName` |
| `Reveal` | Fade-in al hacer scroll (usado en `Home`) | `as` cambia la etiqueta |
| `ReceiptTemplate` / `ReceiptFields` | Plantilla A4 de los comprobantes PDF | — |

### Reglas que NO deben romperse

- **`.header` es `position: fixed`** → toda sección principal necesita `page-top-offset` (`padding-top: 120px`) o el contenido queda tapado.
- **`.nav-centered`** lo usan `AdminHeader` y `PublicHeader logoOnly`. El header público con links usa `.nav` sin ese modificador.
- **`.footer-centered`** centra solo el `footer-bottom`. Con `.footer-content` (3 columnas) la variante `home`/`vouchers` lo combina; no cambiar esa combinación sin revisar mobile.

---

## 4. Mapa de páginas

| Ruta | Componente | Tipo | Header | Footer | Auth |
|---|---|---|---|---|---|
| `/` | `Home` | Pública — landing | `PublicHeader` (`HOME_LINKS`) | `home` | No |
| `/login` | `Login` | Pública — acceso admin | `PublicHeader` (`LOGIN_LINKS`) | — | No |
| `/vouchers` | `Vouchers` | Pública — residentes | `PublicHeader` (`VOUCHERS_LINKS`) | `vouchers` | No |
| `/calculator-medidor` | `CalculatorMedidor` | Pública — residentes | `PublicHeader logoOnly` | — | No |
| `/dashboard` | `Dashboard` | Admin — vouchers | `AdminHeader` | mínimo | Sí |
| `/dashboard-calculator` | `DashboardCalculator` | Admin — medidores | `AdminHeader` | mínimo | Sí |
| `/calcular-pago` | `CalcularPago` | Admin — calculadora electricidad | `AdminHeader` | mínimo | Sí |
| `/comprobante-pago` | `ComprobantePago` | Admin — PDF alquiler | `AdminHeader` | mínimo | Sí |
| `/comprobante-servicios` | `ComprobanteServicios` | Admin — PDF servicios | `AdminHeader` | mínimo | Sí |

- Las rutas admin cuelgan de `ProtectedRoute` (`src/auth/`): sin token redirige a `/login`.
- Las URLs `.html` antiguas redirigen a la ruta nueva; ver `src/app/routes.jsx`.
- Los PDF se generan con `html2pdf.js` (dependencia npm, carga diferida en `src/lib/pdf.js`).

---

## 5. Clases CSS críticas por contexto

### 5.1 Header y Navegación

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.header` | Header fijo con glassmorphism | Todo el sitio queda sin navbar |
| `.nav` | Flexbox logo + menú | Layout del header |
| `.nav-centered` | Centra el logo (admin) | Logo descentrado en admin |
| `.logo` | Gradiente azul-morado en texto | Pierde identidad visual del título |
| `.nav-link` | Link con underline animado hover | Navegación sin estilo, pierde el `::after` animado |
| `.logout-btn` | Botón dorado (`--color-warning`) | Botón de logout sin distinción visual |

### 5.2 Secciones y contenedores

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.page-top-offset` | `padding-top: 120px` (↑140px tablet, ↑170px mobile) | Contenido tapado por el header fijo |
| `.contact` | Background de sección con `padding: 100px 0` | Fondo y espaciado desaparecen |
| `.vouchers-center` | `flex-column + align-items: center` | Formularios y tablas pierden centrado |
| `.container` | `max-width: 1200px; margin: 0 auto` | Contenido se expande al 100% |
| `.contact-form` | Tarjeta blanca, `max-width: 700px`, borde top gradiente | Formularios sin tarjeta; el `::before` agrega la barra de color |
| `.form-row` | Grid 2 columnas (`1fr 1fr`) → 1 col en mobile | Inputs en fila de dos |
| `.form-group` | Bloque label+input con `margin-bottom: 2rem` | Espaciado entre campos |
| `.form-group.error` | Muestra `.error-message` (rojo) y borde rojo en input | Validación visual no funciona |
| `.error-message` | Oculto por defecto (`display: none`); se muestra con `.error` en padre | Mensajes de error siempre visibles |

### 5.3 Botones

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.cta-button` | Gradiente azul-morado, mayúsculas, `animation: pulse-glow` | Botón principal sin estilo; animación se pierde |
| `.cta-button:hover` | `translateY(-3px) scale(1.08)`, brillo | Hover sin feedback |
| `.submit-button` | Similar a CTA pero `width: 100%`, sin animación de pulso | Botón de envío en formularios públicos |
| `.btn-secondary` / `.button-secondary` | Outline azul → relleno en hover | Botones secundarios |
| `.logout-btn` | Dorado (`#D69E2E`) | Sin distinción del botón de cerrar sesión |

> **Atención:** `.login-form .cta-button` sobreescribe la animación `pulse-glow` con `animation: none`. Esto es intencional para que el botón de login no pulse.

### 5.4 Tablas (páginas admin)

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.table-container` | Tarjeta con `overflow-x: auto`, barra top gradiente vía `::before` | Tabla sin scroll horizontal en mobile |
| `.data-table` | `border-collapse: collapse`, `width: 100%` | Tabla sin estilos base |
| `.data-table thead th` | Azul (`--color-primary`), fondo gris suave | Encabezados sin diferenciación |
| `.data-table tbody tr:hover` | Fondo gris + borde izquierdo azul de 3px | Sin feedback visual en filas |
| **mobile (`≤768px`)** | `thead` se oculta; cada `tr` es un bloque; `td::before` muestra `data-label` | Las celdas en mobile necesitan atributo `data-label` en el HTML |

### 5.5 Métricas (`DashboardCalculator`)

| Clase | Efecto | Uso |
|---|---|---|
| `.metrics-grid` | Grid `auto-fit minmax(250px)`, `margin: 2rem 0 3rem` | Contenedor de metric-cards |
| `.metric-card` | Tarjeta con barra top gradiente vía `::before`, hover con elevación | Card de estadística |
| `.metric-title` | Texto secundario, `font-weight: 600` | Etiqueta de la métrica |
| `.metric-value` | `2.5rem`, azul, text-shadow glow | Número grande de la métrica |

### 5.6 Paginación mensual

| Clase | Efecto | Páginas que la usan |
|---|---|---|
| `.month-pagination` | Flexbox centrado, `gap: 1.5rem`, `margin: 1.5rem 0` | `Dashboard`, `DashboardCalculator`, `CalcularPago` |
| `.month-nav-btn` | Cuadrado azul 40×40px, hover oscurece + glow | Botones ← → |
| `.month-label` | `min-width: 180px`, centrado, `font-weight: 600` | Texto "Mes Año" |

### 5.7 Calculadora de medidor (`/calculator-medidor`)

| Clase | Efecto |
|---|---|
| `.calculator-container` | Tarjeta centrada `max-width: 600px` |
| `.calculator-section` | Sección principal — usa `.calculator-container` dentro de `.container` |
| `.measurement-input` | `position: relative` para ubicar la unidad kWh |
| `.measurement-unit` | "kWh" absoluto a la derecha del input |
| `.photo-upload-container` | Grid de grupos de foto |
| `.photo-upload-group` | Borde punteado → sólido verde con `.has-photo` |
| `.upload-buttons` | Grid 2 col → 1 col en mobile |
| `.upload-btn` | Outline azul → relleno en hover |
| `.photo-preview` | `max-height: 200px`, `object-fit: cover` |
| `.calculation-result` | Oculto por defecto; `.show` lo muestra con animación slide |
| `.result-amount` | `2rem`, azul, `font-weight: 700` |
| `.processing` | Opacidad 0.7, `pointer-events: none`, spinner `::after` |

### 5.8 Modal

| Clase | Efecto | Activación |
|---|---|---|
| `.modal` | `display: none`, overlay negro con blur | El componente `Modal` agrega `.show` cuando `open` es `true` |
| `.modal.show` | `display: flex`, centrado, `fadeInModal` animación | Prop `open` de `Modal` |
| `.modal-content` | Tarjeta centrada `max-width: 400px` | — |
| `.image-modal-content` | Variante para imágenes: `max-width: fit-content` | `Dashboard` (`contentClassName`) |
| `.modal-image` | `max-width: 85vw, max-height: 80vh, object-fit: contain` | — |
| `.close-modal-btn` | X circular absoluto top-right, rota 90° en hover | `Dashboard` |
| `.close-modal` | Botón de cierre en los modales de `CalculatorMedidor` y `DashboardCalculator` | `margin-top: 1.5rem` |

> **Dos patrones de cierre modal coexisten:**
> - `Dashboard` usa `.close-modal-btn` (X circular).
> - `CalculatorMedidor` y `DashboardCalculator` usan `.close-modal`.
>
> Todos los modales usan el componente `src/components/Modal.jsx` (overlay `.modal` + `.modal-content`); un click en el overlay llama a `onBackdropClick`.

### 5.9 Login

| Clase | Efecto | Nota |
|---|---|---|
| `.login` / `.login-page` | Sección centrada verticalmente, `padding-top: 120px` | Solo en `Login` |
| `.login-container` | `max-width: 420px` | — |
| `.login-card` | Tarjeta blanca con `border-radius: 16px` | — |
| `.login-form .cta-button` | Sobreescribe el CTA: sin animación, sin transform, fondo azul sólido | Intencional — evitar la animación pulse en login |

### 5.10 Fotos de medidor (tablas admin)

| Clase | Efecto |
|---|---|
| `.foto-medidor-preview` | Thumbnail 60×60px, `cursor: pointer`, escala en hover |
| `.foto-ampliada` | Estilo heredado (fixed, `z-index: 9999`); ninguna página React lo usa hoy: la foto ampliada se muestra en el `Modal` |
| `.sin-foto` | Estilo italic gris para celdas sin imagen |
| `.imagen-error` | Rojo para errores de carga de imagen |

### 5.11 Utilidades

| Clase | Efecto |
|---|---|
| `.section-title` | `3rem`, gradiente text, `letter-spacing: -0.02em` |
| `.section-subtitle` | `1.5rem`, morado (`--color-secondary`), centrado |
| `.contact-subtitle` | `1.3rem`, centrado, texto secundario, `margin-bottom: 4rem` |
| `.no-data-message` | Fondo gris degradado, borde punteado, centrado |
| `.form-help` | `display: block`, texto gris pequeño debajo del input |
| `.badge` / `.highlight` / `.alert` | Gradiente verde-dorado, texto blanco, mayúsculas |
| `.status-badge` | Badge de estado, pill shape |
| `.status-active` | Verde suave (`--color-accent`) |
| `.consumo-cell` | Verde (`--color-accent`), `font-weight: 600` |
| `.loading-spinner` | Spinner animado (contexto de overlay) o texto "Cargando…" |
| `#loadingOverlay` | Full-screen overlay blanco con spinner, `z-index: 1000` |

---

---

## 6. Responsive — breakpoints definidos

| Breakpoint | Cambios clave |
|---|---|
| `≤768px` | `.nav` stacks vertical; `.hero` 1 col; `.form-row` 1 col; `.data-table` convierte a cards; `.metrics-grid` 1 col; `.footer-centered` centra secciones; `.page-top-offset` sube a 140px |
| `≤480px` | Tamaños de fuente reducidos; padding comprimido; `.page-top-offset` sube a 170px; `.login-form input` fija `font-size: 16px` (evita zoom iOS) |
| `≥769px–1199px` | `.login` ajusta `padding-top: 8.5rem` |
| `≥1200px` | `.login` ajusta `padding-top: 9rem` |
| `height ≤600px` | `.login` `align-items: flex-start` |

---

---

## 7. Fuente externa

Open Sans se carga desde Google Fonts en `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
```

> Si se cambia la fuente, actualizar también `--font-family` en `:root`.

---

## 8. Patrones que pueden romperse fácilmente

### 8.1 `.data-table` y `.table-container` están definidos dos veces

`styles.css` define ambas clases en dos lugares (la segunda parte hacia el final del archivo) y la segunda sobreescribe parcialmente a la primera. Buscar las dos ocurrencias antes de editar.

- Primera definición: `thead th` con `color: var(--color-primary)` y fondo rgba; `tbody td` con bordes individuales.
- Segunda definición: `th` y `td` unificados, encabezados con `background: var(--bg-secondary)`.

### 8.2 `.loading-spinner` — dos roles distintos

- En `.login-form .cta-button`: spinner circular chico (16px, `border-radius: 50%`, `animation: spin`).
- Como componente global: texto "Cargando…" con `min-height: 200px`, sin borde circular.

Cambiar `.loading-spinner` de forma genérica afecta a ambos contextos.

### 8.3 `.contact-form` con `transform: none !important`

El formulario anula transformaciones en hover con varias reglas `!important` para que la tarjeta no se mueva. **No agregar `transform` a `.contact-form` ni a sus hijos directos.**

### 8.4 `.cta-button` y `animation: pulse-glow`

El botón CTA pulsa por defecto. `Login` lo desactiva con `animation: none` dentro de `.login-form .cta-button`. Un `.cta-button` nuevo en login fuera de ese contexto pulsará.

### 8.5 Tablas mobile — `data-label`

En mobile (`≤768px`) `thead` se oculta y cada celda se etiqueta con `td::before { content: attr(data-label) }`. La tabla de `Dashboard` ya define `data-label`; si se agrega una columna nueva a una tabla que lo usa, incluir el atributo o la celda queda sin etiqueta en mobile.

### 8.6 Footer: `.footer-centered` vs `.footer-content`

- `Home` y `Vouchers` usan el footer de 3 columnas (`.footer-content`).
- Las páginas admin solo tienen `.footer-bottom` (copyright).
- Mezclar ambos patrones en una misma página puede desalinear las columnas en mobile.

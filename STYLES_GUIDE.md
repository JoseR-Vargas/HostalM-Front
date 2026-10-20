# Guía de Estilos y Estructura — Hostal Mayelewoo Frontend

> Referencia para cambios seguros en `css/styles.css` y las páginas HTML.
> Última revisión: 2026-03-27

---

## 1. Variables CSS (`:root`)

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

## 2. Layout base compartido por todas las páginas

```
<body>
  <header class="header">          ← fijo, z-index 1000, backdrop blur
    .container
      .nav [.nav-centered]         ← .nav-centered centra el logo (admin)
        .logo
        .nav-menu
  </header>

  <section class="contact page-top-offset">   ← sección principal
    .container [.vouchers-center]
      ...contenido...
  </section>

  <footer class="footer footer-centered">
    .container
      .footer-bottom
  </footer>
</body>
```

### Reglas que NO deben romperse

- **`.header` es `position: fixed`** → todas las páginas necesitan `page-top-offset` (`padding-top: 120px`) en la sección principal, o el contenido queda tapado.
- **`.nav-centered`** solo aplica en páginas admin. En `index.html` y `login.html` el nav usa `.nav` sin ese modificador.
- **`.footer-centered`** centra el `footer-bottom` solo. Si el footer tiene `.footer-content` (3 columnas), no usar `footer-centered` en desktop.

---

## 3. Mapa de páginas

| Archivo HTML | Tipo | Scripts cargados | Auth requerida |
|---|---|---|---|
| [index.html](index.html) | Pública — landing | `script.js` | No |
| [login.html](login.html) | Pública — acceso admin | `config.js`, `login.js` | No |
| [vouchers.html](vouchers.html) | Pública — residentes | `vouchers.js` (incluye `config.js` internamente) | No |
| [calculator-medidor.html](calculator-medidor.html) | Pública — residentes | `config.js`, `calculator-medidor.js` | No |
| [contadores-luz.html](contadores-luz.html) | Pública — residentes | `config.js` (ausente en HTML actual), `contadores-luz.js` | No |
| [dashboard.html](dashboard.html) | Admin — vouchers | `config.js`, `login.js`, `dashboard.js` | Sí (`requireAuth()`) |
| [dashboard-calculator.html](dashboard-calculator.html) | Admin — medidores | `config.js`, `login.js`, `dashboard-calculator.js` | Sí |
| [calcular-pago.html](calcular-pago.html) | Admin — calculadora electricidad | `config.js`, `login.js`, `calcular-pago.js` | Sí |
| [comprobante-pago.html](comprobante-pago.html) | Admin — PDF comprobante | `config.js`, `login.js`, `comprobante-pago.js`, `html2pdf` CDN | Sí |
| [dashboard-luz.html](dashboard-luz.html) | Admin — contadores | `login.js`, `dashboard-luz.js` | Sí |

> **Nota:** `dashboard-luz.html` no carga `config.js` — si `dashboard-luz.js` lo necesita, falta esa dependencia.

---

## 4. Clases CSS críticas por contexto

### 4.1 Header y Navegación

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.header` | Header fijo con glassmorphism | Todo el sitio queda sin navbar |
| `.nav` | Flexbox logo + menú | Layout del header |
| `.nav-centered` | Centra el logo (admin) | Logo descentrado en admin |
| `.logo` | Gradiente azul-morado en texto | Pierde identidad visual del título |
| `.nav-link` | Link con underline animado hover | Navegación sin estilo, pierde el `::after` animado |
| `.logout-btn` | Botón dorado (`--color-warning`) | Botón de logout sin distinción visual |

### 4.2 Secciones y contenedores

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

### 4.3 Botones

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.cta-button` | Gradiente azul-morado, mayúsculas, `animation: pulse-glow` | Botón principal sin estilo; animación se pierde |
| `.cta-button:hover` | `translateY(-3px) scale(1.08)`, brillo | Hover sin feedback |
| `.submit-button` | Similar a CTA pero `width: 100%`, sin animación de pulso | Botón de envío en formularios públicos |
| `.btn-secondary` / `.button-secondary` | Outline azul → relleno en hover | Botones secundarios |
| `.logout-btn` | Dorado (`#D69E2E`) | Sin distinción del botón de cerrar sesión |

> **Atención:** `.login-form .cta-button` sobreescribe la animación `pulse-glow` con `animation: none`. Esto es intencional para que el botón de login no pulse.

### 4.4 Tablas (páginas admin)

| Clase | Efecto | Rompe si se elimina |
|---|---|---|
| `.table-container` | Tarjeta con `overflow-x: auto`, barra top gradiente vía `::before` | Tabla sin scroll horizontal en mobile |
| `.data-table` | `border-collapse: collapse`, `width: 100%` | Tabla sin estilos base |
| `.data-table thead th` | Azul (`--color-primary`), fondo gris suave | Encabezados sin diferenciación |
| `.data-table tbody tr:hover` | Fondo gris + borde izquierdo azul de 3px | Sin feedback visual en filas |
| **mobile (`≤768px`)** | `thead` se oculta; cada `tr` es un bloque; `td::before` muestra `data-label` | Las celdas en mobile necesitan atributo `data-label` en el HTML |

### 4.5 Métricas (dashboard-calculator)

| Clase | Efecto | Uso |
|---|---|---|
| `.metrics-grid` | Grid `auto-fit minmax(250px)`, `margin: 2rem 0 3rem` | Contenedor de metric-cards |
| `.metric-card` | Tarjeta con barra top gradiente vía `::before`, hover con elevación | Card de estadística |
| `.metric-title` | Texto secundario, `font-weight: 600` | Etiqueta de la métrica |
| `.metric-value` | `2.5rem`, azul, text-shadow glow | Número grande de la métrica |

### 4.6 Paginación mensual

| Clase | Efecto | Páginas que la usan |
|---|---|---|
| `.month-pagination` | Flexbox centrado, `gap: 1.5rem`, `margin: 1.5rem 0` | dashboard.html, dashboard-calculator.html, calcular-pago.html |
| `.month-nav-btn` | Cuadrado azul 40×40px, hover oscurece + glow | Botones ← → |
| `.month-label` | `min-width: 180px`, centrado, `font-weight: 600` | Texto "Mes Año" |

### 4.7 Calculadora de medidor (`calculator-medidor.html`)

| Clase | Efecto |
|---|---|
| `.calculator-container` | Tarjeta centrada `max-width: 600px` |
| `.calculator-section` | Sección `main` — usa `.calculator-container` dentro de `.container` |
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

### 4.8 Modal

| Clase | Efecto | Activación |
|---|---|---|
| `.modal` | `display: none`, overlay negro con blur | JS agrega `.show` |
| `.modal.show` | `display: flex`, centrado, `fadeInModal` animación | `classList.add('show')` |
| `.modal-content` | Tarjeta centrada `max-width: 400px` | — |
| `.image-modal-content` | Variante para imágenes: `max-width: fit-content` | dashboard.html |
| `.modal-image` | `max-width: 85vw, max-height: 80vh, object-fit: contain` | — |
| `.close-modal-btn` | X circular absoluto top-right, rota 90° en hover | dashboard.html |
| `.close-modal` | Clase para el botón de cierre en modal de calculadora | `margin-top: 1.5rem` |

> **Dos patrones de cierre modal coexisten:**
> - `dashboard.html` usa `.close-modal-btn` (X circular, `onclick="closeImageModal()"`)
> - `calculator-medidor.html` usa `.close-modal` con clase CTA (`onclick="closeModal()"`)

### 4.9 Login

| Clase | Efecto | Nota |
|---|---|---|
| `.login` / `.login-page` | Sección centrada verticalmente, `padding-top: 120px` | Solo en `login.html` |
| `.login-container` | `max-width: 420px` | — |
| `.login-card` | Tarjeta blanca con `border-radius: 16px` | — |
| `.login-form .cta-button` | Sobreescribe el CTA: sin animación, sin transform, fondo azul sólido | Intencional — evitar la animación pulse en login |

### 4.10 Fotos de medidor (tablas admin)

| Clase | Efecto |
|---|---|
| `.foto-medidor-preview` | Thumbnail 60×60px, `cursor: pointer`, escala en hover |
| `.foto-ampliada` | Fixed, centrado con `translate(-50%,-50%)`, `z-index: 9999` |
| `.sin-foto` | Estilo italic gris para celdas sin imagen |
| `.imagen-error` | Rojo para errores de carga de imagen |

### 4.11 Utilidades

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

## 5. Responsive — breakpoints definidos

| Breakpoint | Cambios clave |
|---|---|
| `≤768px` | `.nav` stacks vertical; `.hero` 1 col; `.form-row` 1 col; `.data-table` convierte a cards; `.metrics-grid` 1 col; `.footer-centered` centra secciones; `.page-top-offset` sube a 140px |
| `≤480px` | Tamaños de fuente reducidos; padding comprimido; `.page-top-offset` sube a 170px; `.login-form input` fija `font-size: 16px` (evita zoom iOS) |
| `≥769px–1199px` | `.login` ajusta `padding-top: 8.5rem` |
| `≥1200px` | `.login` ajusta `padding-top: 9rem` |
| `height ≤600px` | `.login` `align-items: flex-start` |

---

## 6. Fuente externa

Todas las páginas cargan Open Sans desde Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
```

> Si se cambia la fuente, actualizar también `--font-family` en `:root`.
> `calculator-medidor.html` carga pesos adicionales (800, 900) que otras páginas no necesitan.

---

## 7. Dependencia externa única

Solo `comprobante-pago.html` carga una librería de terceros:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

Usada para generar el PDF del comprobante. Sin esta librería `generarComprobante()` falla silenciosamente.

---

## 8. Patrones que pueden romperse fácilmente

### 8.1 Acumulación de `.data-table` — hay dos definiciones

El CSS define `.data-table` y `.table-container` **dos veces** (líneas ~1125 y ~1804). La segunda definición sobreescribe parcialmente a la primera. Si se edita una sola ocurrencia, el resultado puede ser inesperado.

- Primera definición (línea ~1125): `thead th` con `color: var(--color-primary)`, fondo rgba; `tbody td` con bordes individuales.
- Segunda definición (línea ~1804): `th` y `td` unificados, encabezados con `background: var(--bg-secondary)`.

### 8.2 `.loading-spinner` — dos roles distintos

- En `.login-form .cta-button`: spinner circular small (16px, `border-radius: 50%`, `animation: spin`).
- Como componente global: texto "Cargando…" con `min-height: 200px`, sin borde circular.

Ambos usan la misma clase. Cambiar `.loading-spinner` genéricamente puede afectar a ambos contextos.

### 8.3 `.contact-form` con `transform: none !important`

El formulario tiene múltiples reglas `!important` para anular transformaciones en hover. Esto fue agregado para evitar que la tarjeta se mueva cuando el usuario interactúa. **No agregar `transform` a `.contact-form` ni a sus hijos directos.**

### 8.4 `.cta-button` y `animation: pulse-glow`

El botón CTA pulsa por defecto. La página de login sobreescribe esto con `animation: none` dentro de `.login-form .cta-button`. Si se agrega un `.cta-button` en login sin ese contexto, pulsará.

### 8.5 Tablas mobile — `data-label` obligatorio

En mobile (`≤768px`) los `thead` se ocultan y el contenido se lee desde `td::before { content: attr(data-label) }`. Si se agrega una columna nueva sin el atributo `data-label` en el `<td>`, esa celda no tendrá etiqueta en mobile.

### 8.6 Footer: `.footer-centered` vs `.footer-content`

- `index.html` y `vouchers.html` usan footer con las 3 columnas (`.footer-content`).
- Las páginas admin solo tienen `.footer-bottom` (copyright). Usan `.footer-centered`.
- Mezclar ambos en la misma página puede producir un footer con columnas desalineadas en mobile.

---

## 10. Orden de carga de scripts (regla general)

```html
<script src="js/config.js"></script>   <!-- Siempre primero: define APP_CONFIG y CONFIG -->
<script src="js/login.js"></script>    <!-- Segundo en páginas admin: expone requireAuth(), logout() -->
<script src="js/[módulo].js"></script> <!-- Último: lógica de la página -->
```

> `vouchers.html` no carga `config.js` por separado — `vouchers.js` puede incluirlo internamente o asumir que no hay cambios de backend URL.

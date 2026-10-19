# Feature: migrate-react

Branch: `feat/migrate-react` (single PR at the end; user pushes and opens the PR; agent makes local work-unit commits only, no push).
Delivery strategy: `single-pr` (user decision).

## Objective
Migrate the production vanilla HTML/CSS/JS frontend (Hostal Mayelewoo) to React (Vite + React Router, **JavaScript**, no TypeScript) without changing user-visible behavior, backend contracts or visual design.

## Constraints
- Production app: nothing may break. Behavior parity is the acceptance bar.
- Backend hosts per endpoint stay exactly as in production today: auth + `/api/calculos-medidor` -> `https://hostal-mayelewoo-backend.vercel.app`; `/api/vouchers` -> `https://mayelewoo-back.onrender.com`; localhost -> `http://localhost:3000`. `?backend=local|<url>` override is kept. All resolved in ONE module, overridable by env (`VITE_API_URL`, `VITE_VOUCHERS_API_URL`).
- Remove dead code (unreferenced functions, mock auth with hardcoded creds, unused CONFIG keys, `displayVouchers`, `test-calculos-medidor.js`) and orphan pages (`contadores-luz`, `dashboard-luz`).
- Legacy URLs `/xxx.html` must keep working (redirect to the new route).
- Playwright tests run against MOCKED API (page.route) only. Never hit real/production backends (skill playwright-qa-safety).
- Artifacts (code, comments, UI copy) follow the existing UI language (Spanish copy is preserved verbatim); identifiers/comments in English.
- Advisory planning heuristic ~400 authored changed lines per task; not a hard cap.

## Layout
- `legacy/` = original static app moved with `git mv` (reference for parity; deleted in T7).
- React app at repo root: `index.html` (Vite entry), `src/`, `public/img`, `package.json`.

## Business rules preserved exactly
PRICE_PER_KWH 439.26; Argentine money parse/format (`200.000,50` <-> 200000.50); meter reading normalization (`35659` -> `3565.9`, regex `^\d+[.,]\d+$`, actual > anterior, DNI 7-8 digits); photos image/* <= 5MB each, both required; vouchers images only, total <= 50MB, amount regex `^\d{1,3}(\.\d{3})*(,\d{1,2})?$` >= 1000, ref4 exactly 4 digits; calcular-pago pipeline (month filter, latest per habitacion, sort alpha, precio = monto/totalKwh, total = consumo*precio); receipts A4 portrait html2pdf (margin 0, jpeg .98, scale 2, useCORS, pagebreak avoid-all), filename `Comprobante_<cliente>_<periodo>.pdf`; WhatsApp number 5493516664584, 200 char message limit; auth `POST {vercel}/api/auth/login`, token in sessionStorage `mayelewoo_admin_token`.

## Tasks
- [ ] T1 Scaffold: `git mv` legacy -> `legacy/`, Vite+React+Router+Vitest+Playwright config, `.gitignore`, `vercel.json` SPA rewrites, shared lib (api config/client, auth context + ProtectedRoute, money/measurement/date utils with unit tests), layout components (Header/Footer/AdminNav), global CSS import, legacy `.html` redirects. Route: delegated writer.
- [ ] T2 Public pages: Home (index), Login, Vouchers, CalculatorMedidor (+ offline pending queue behavior only if referenced). Route: delegated writer.
- [ ] T3 Admin pages: Dashboard (vouchers + image modal + month pager), DashboardCalculator (filters + photo modal), CalcularPago (two-step calculator). Route: delegated writer.
- [ ] T4 Receipts: ComprobantePago, ComprobanteServicios with html2pdf (npm dep), shared PDF service. Route: delegated writer.
- [ ] T5 Playwright e2e (mocked API) for every flow + legacy-URL redirects; fix parity bugs found. Route: delegated writer.
- [ ] T6 Parity review vs `legacy/` (read-only verify) and fixes. Route: verify agent + writer.
- [ ] T7 Delete `legacy/`, update STYLES_GUIDE.md/README, final `npm run build`, `npm test`, `npm run e2e`.

## Acceptance
`npm run build`, `npm test` (vitest) and `npm run e2e` (playwright, mocked API) pass; every legacy page except orphans has a React route; no references to deleted code.

## Progress / evidence
(none yet)

## Next step
T1.

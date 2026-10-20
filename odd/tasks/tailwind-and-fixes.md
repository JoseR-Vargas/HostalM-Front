# Feature: tailwind-and-fixes

Branch: `feat/migrate-react` (same single PR; local work-unit commits only, user pushes).

## Objective
1. Fix the known production-quirk bugs found during the React migration.
2. Replace the global `src/styles/styles.css` (+ `home.css`) with Tailwind CSS v4 utilities/theme, with NO visual regression, and reduce total source lines by deduplicating markup into small components.

## Constraints
- Production app. Visual and behavioral parity is the bar, except the intentional fixes below.
- Visual regression is checked with Playwright screenshot comparison: baseline generated from the pre-Tailwind code (after F1), compared after each style task. Baselines are NOT committed (gitignored); the harness is temporary and removed in S4.
- Backends always mocked in e2e.
- Receipt PDF template keeps inline styles (html2canvas needs computed styles).
- Spanish UI copy preserved except where a fix requires a truthful message.
- Identifiers/comments in English.

## Fix list (F1)
a. Voucher upload failure must show an honest error (keep the form data so the user can retry); remove the fake success banner, the `pendingVouchers` localStorage write and the admin Dashboard fallback to it (show an error state instead).
b. Calculator-medidor: remove the dead `pendingSyncCalculations` queue and the false "se sincronizará automáticamente" copy; a failed save must say truthfully it was NOT registered and can be retried.
c. Voucher amount validation: parse Argentine format properly so `500,50` (= 500.5) fails the 1000 minimum.
d. Receipts default date uses local time, not UTC.
e. Mobile tap targets: month arrows in calcular-pago >= 40px; fixed header must not take ~half of a 320x568 viewport (compact it on narrow screens).
f. Restore the `/health` prewarm when entering any admin route (legacy did it on every admin page).

## Tasks
- [x] F1 Behavior fixes a-f, tests first (Vitest + update affected Playwright specs). Delegated writer.
- [x] S0 Visual baseline harness (all routes x 375/768/1280 + key open modals/states, fixed clock, animations off), baselines generated from the post-F1 code, gitignored. Delegated writer.
- [x] S1 Tailwind v4 setup (`@tailwindcss/vite`, `@theme` tokens from the old `:root` vars), shared components (Layout, headers, footer, Modal, Button/Field primitives) + public pages migrated; delete the migrated CSS rules; visual diff green. Delegated writer.
- [x] S2 Admin pages migrated (Dashboard, DashboardCalculator, CalcularPago); delete their CSS; visual diff green. Delegated writer.
- [x] S3 Receipts + leftovers: `styles.css` / `home.css` fully removed, only `src/index.css` (tailwind import, theme, keyframes). Delegated writer.
- [x] S4 Remove visual harness, update STYLES_GUIDE.md/README, final `npm test`, `npm run build`, `npm run e2e`, LOC before/after report.

## Acceptance
All checks pass; visual diff within tolerance for every baseline except documented intentional changes; `styles.css`/`home.css` deleted; total non-test src lines reduced.

## Progress / evidence
- F1 8eefdbb | S0 caa1da9 (harness, later removed) | S1 0c27b71 | S2 8b2be9a | S3+S4 3411909. All delegated writers.
- Visual parity: 81 screenshots 0 diffs at every step, plus computed-style/bbox/hover diffs vs previous commit (0 differences). Preflight not adopted (changes layout everywhere).
- Final: `npm test` 338 passed; `npm run build` ok; `npm run e2e` 166 passed.
- LOC: CSS 2335 -> 136; CSS+jsx+js 6160 -> 4020 (-35%); non-test jsx +59 (styling moved to markup).

## Next step
User pushes. Optional follow-up: reduce JSX further, hover/focus states not covered by screenshots.

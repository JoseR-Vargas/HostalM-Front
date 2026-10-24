# Feature: preline-ui

Branch: `feat/migrate-react-v2` (local work-unit commits only; user pushes and opens the PR).

## Objective
Adopt the Preline design system (npm `preline` 4.2.0, already installed) as the visual style of: buttons, spinners, inputs, modals and the admin dashboard tables, using the exact class recipes the user supplied (pill primary/secondary buttons, `animate-spin` ring spinner, rounded-full inputs, `bg-overlay` modal card, `divide-table-line` table).

## Decisions
- Preline semantic tokens (`primary`, `primary-hover`, `primary-line`, `primary-focus`, `primary-foreground`, `layer*`, `surface*`, `overlay*`, `foreground`, `muted-foreground-1/2`, `table-line`, `scrollbar-*`) come from `preline/theme.css`. Our current `@theme static` tokens collide (`--color-primary`, maybe `muted`, `border`, `accent`...). Keep the BRAND colors: map Preline's primary tokens to the existing brand blue (#2b6cb0, hover #2c5282) so links/header/everything else keep their color; only shape/structure of the five component families changes. Palette switch to Preline default can be a later decision.
- Preline's JS plugins (HSOverlay, `data-hs-overlay`, `hs-overlay` classes) are NOT used. Modals stay React-state-controlled (open/close, Escape, overlay click as today); only the Preline look is applied.
- `@tailwindcss/forms` is required for the input recipe (`focus:ring-*`); adding it is accepted (it restyles text inputs, selects, textareas app-wide, which is the intent). Tailwind Preflight stays OUT (see `src/index.css` header).
- Specs/tests select hook classes/ids and state classes (`error`, `show`, `processing`): keep them.
- Receipt PDF template keeps its inline styles untouched.
- Visual check: Playwright screenshots (375 and 1280) of the touched pages reviewed by the parent; no pixel baseline exists any more (this is an intentional restyle).

## Tasks
- [x] P1 Wiring: `@tailwindcss/forms`, `preline/variants.css`, `preline/theme.css` import in `src/index.css` with token-collision resolution; Button (primary + secondary recipes, `processing` state keeps working) and Spinner (single `Spinner` component, replaces ad-hoc spinners/overlays). Delegated writer.
- [x] P2 Inputs (every `Field`/form input incl. receipts' fields), Modal (shared `Modal` + `ModalTitle`, result modal, image modals), DataTable (admin dashboards). Delegated writer.
- [x] P3 Review screenshots, fix regressions, update STYLES_GUIDE.md/README, final `npm test`, `npm run build`, `npm run e2e`.

## Acceptance
All checks pass; every touched component matches the supplied recipes; brand color retained elsewhere; no unintended layout changes on untouched pages (spot-check screenshots).

## Progress / evidence
- P1 5db5250 (wiring, Button, Spinner; preline/theme.css NOT imported, light-theme token subset, brand colors verified unchanged via computed-style diff) | P2 (inputs, Modal, DataTable) committed after parent review of screenshots | P3 folded into parent review (login banner spacing fix).
- Final: `npm test` 361 passed; `npm run build` ok; `npm run e2e` 166 passed.

## Next step
User pushes and checks the Netlify preview visually.

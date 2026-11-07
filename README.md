# INSYDE accessibility audit

An automated and manual accessibility audit of the INSYDE web app (a Next.js training platform for factory workers,
engineers and managers), run in November 2026. This repository holds the audit scripts, the raw results, and a
write-up of what was found, what was fixed and what is still open. It does not contain the INSYDE application code.

**Standard:** WCAG 2.2 level AA, plus axe-core's best-practice rules.
**Tools:** [axe-core](https://github.com/dequelabs/axe-core) driven by [Playwright](https://playwright.dev), plus manual keyboard checks.
**Not a conformance claim.** Automated tools catch only part of what WCAG asks of a page, and no screen-reader testing
has been done yet (see [Not covered](#not-covered)).

## Scope

- 8 public routes (landing page, sign-in, demo booking and others), at 1280px and 375px wide.
- 4 signed-in role portals (worker, manager, admin, engineer), 46 page views in the first pass.
- Run against a local development build with no database behind it, so some signed-in pages showed empty or error states.

## Results

| | Page views | Violations (axe nodes) |
|---|---|---|
| **Public pages, first run** | 16 | 64, all moderate (56 `region`, 8 `landmark-one-main`), all on the sign-in page |
| **Public pages, after fixes** | 14 | **0** (`results/public-after.json`) |
| **Signed-in, first pass** | 46 audited, 4 not reached | 55, all moderate (`skip-link`, `region`, `page-has-heading-one`, `landmark-one-main`) (`results/signed-in-first-pass.json`) |
| **Signed-in, second pass** (10 pages that had failed, desktop) | 10 | 9 pages at 0; 1 page has no `h1` |

The raw output of the public first run was not archived; the numbers above are from the run log. The signed-in
first pass was taken after the main-landmark fix but before the skip link was made to find pages that draw their `<main>`
late; those 55 nodes are mostly that skip-link problem.

No serious or critical violation turned up on any page that loaded.

## What was fixed

1. **No `<main>` landmark on the sign-in pages.** Added one. This cleared all 64 first-run findings.
2. **No skip link.** The app had a skip-link component that nothing rendered. It is now first in `<body>`. Many pages draw
   their own `<main>` after data loads, so it watches the document and tags the one on screen
   ([`examples/skip-to-content.tsx`](examples/skip-to-content.tsx) is a standalone copy).
3. **Weak keyboard focus indicators**, three places where focus changed only a pale background or border:
   the demo form fields (a light-blue border, about 1.9:1 against white), the language panel buttons and the sign-in
   language list. Each now has a clear outline or a stronger border.

## What was checked and held up

- **Keyboard order and focus rings** on the landing page: all 14 first stops show a ring.
- **Reduced motion:** with `prefers-reduced-motion` on, running animations on the landing page fell from 35 to 0.
- **Reflow:** no sideways scrolling at 320px on the pages checked.
- **Structure:** `lang` set, one `h1` per page, no skipped heading levels, no image without `alt` on the public pages.
- **Video captions:** axe flags the landing video as "needs review" because it cannot see burned-in captions.
  The captions are part of the picture, so this is a false positive.

## Still open

- **`/catalogue` (manager) has no `h1`.**
- **Colour contrast needs a human look** on the landing and sign-in pages: axe could not decide where text sits over
  gradients or images.
- **Phone-number field focus:** the field's focus is shown by its wrapper's border and shadow, which the keyboard script reports as
  "no ring". It looks right by eye, but check the border's contrast against the 3:1 minimum.
- **Photo tap-to-place** (an engineer tool) has no keyboard alternative: a person who cannot use a pointer cannot place a marker.
- **Some signed-in pages rendered empty** without a database (`/review`, `/energy`, `/assigned`, `/training/catalogue`,
  `/learning-paths`, `/engineer/catalogue`), so they were not truly audited. Engineer mobile views and four admin pages were not
  reached when the development server stopped.

## Not covered

- **Screen readers** (VoiceOver, NVDA). Nobody has listened to these pages yet.
- Zoom to 200% and 400%, forced-colours mode, and speech-input software.
- Real content: the audit saw sample or empty states, not production data.

## Run it

```bash
npm install
BASE_URL=http://localhost:3000 ROUTES=/,/login OUT=run npm run audit
BASE_URL=http://localhost:3000 ROUTES=/,/login npm run keyboard
```

`audit` writes `results/<OUT>.json`. To audit signed-in pages, pass your own session cookie as `COOKIES='[{"name":"...","value":"...","domain":"localhost","path":"/"}]'`.
Set `CHROME_PATH` if Chrome is not in the usual macOS location. Only run it against sites you own or have permission to test.

## Layout

```
scripts/audit.js            axe-core on a list of routes, two viewport widths
scripts/keyboard-check.js   focus rings, reduced motion, 320px reflow
examples/skip-to-content.tsx  the skip link used in the fix
results/                    raw audit output (page text removed)
```

# Log

## 2026-07-09

Scaffolded the project (Vite + React 19 + TypeScript + Tailwind CSS 3) and built the
first landing page from the Figma file (node-id=29-113), plus a Header/Footer shell.

**Files added:**
- `src/pages/LandingPage.tsx` — hero (value prop + CTA + overview cards) and a
  "How it works" 3-step section (Scan → Check in or out → Always up to date),
  mirroring the Scan Book / Result / Loan-Return screens in the Figma file.
- `src/components/layout/Header.tsx` — logo, search input, Books/Classes nav.
  Nav items are `<button>`s, not links, until those pages exist to route to.
- `src/components/layout/Footer.tsx` — minimal copyright/tagline footer (not in
  the Figma file; added as a standard landing-page closer).
- `src/App.tsx` — renders `LandingPage` (no router yet; single page).
- `tailwind.config.js` — theme extended with the Figma "Design Tokens" variable
  collection values (see below).

**Tailwind tokens pulled from Figma (`Design Tokens` collection, single "Value" mode):**
- Colors: `ink.primary` #0D0D0D, `ink.muted` #6B7280, `surface.DEFAULT` #FFFFFF,
  `surface.subtle` #F2F2F2, `line.DEFAULT` #E4E4E0 (mirrors
  `color/text/primary`, `color/text/muted`, `color/surface/default`,
  `color/surface/subtle`, `color/border/default`).
- Radius: `rounded-input` 8px, `rounded-pill` 999px (`radius/input`, `radius/pill`).
- Spacing: `xs` 8px / `sm` 12px / `md` 16px / `lg` 20px / `xl` 24px / `2xl` 32px
  (`space/xs`...`space/2xl`).
- Fonts: `font-display` → Quicksand (logo only), `font-sans` → Inter (everything
  else), loaded via Google Fonts in `index.html`. Matches the `Display/Logo`,
  `Heading/*`, `Body/*`, `Label/Small` text styles in Figma.

**Layout notes:**
- Tablet-landscape (matching the Figma 1024px frame) is the base/unprefixed
  layout: header in one row (logo · search · nav), hero as a 2-column grid,
  "How it works" as a 3-column grid. Portrait/phone is handled by Tailwind's
  default mobile-first cascade (`lg:` overrides) plus `flex-wrap` on the header,
  so everything stacks to a single column below the `lg` (1024px) breakpoint —
  verified by screenshotting both a 1024×768 and a 768×1024 viewport.
- All interactive targets (search input, nav buttons, CTA buttons) are ≥44px
  tall for touch use.

Verified: `npm run build` and `tsc -b` both pass clean; dev server smoke-tested
in headless Chromium at tablet-landscape and tablet-portrait sizes with no
console errors.

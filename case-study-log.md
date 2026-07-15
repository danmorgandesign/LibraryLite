# Library Lite — Case Study Log

Running record of design decisions, rejected directions, and user-facing
rationale for Library Lite — kept so writing the portfolio case study is
assembly, not archaeology. Distinct from `LOG.md`, which is an engineering
changelog (files added, tokens pulled, what was verified); this file is
about *why*, for a portfolio audience. Entries are dated and grouped under
the case study's own headers (Problem / Solution / Process / Screens).

Figma file: `ufE3h5LxKNO4XfMFR82cSt`. Portfolio page: `danmorgan/library-lite.html`.
Code: this repo, deployed to `danmorgandesign.github.io/LibraryLite/`.

---

## 01 — The Problem

- School libraries run on "beautiful chaos" — thirty children wanting to
  choose a book at once, plus legacy software that doesn't fit that reality.

## 02 — The Solution

- Core idea: scan-first, decide-later. No menus before the app knows what
  book it's looking at, no decisions before the scan happens.
- **Classes concept — corrected mid-project:** first attempt at the
  "Classes" screen was a filterable Open/Full enrollment-style table (like
  a Yoga Basics activity list) — wrong. This is a school library app:
  "Classes" means actual school homerooms (e.g. "Squirrels"), and the
  screen needed to be a roster/loan-management surface per class, not an
  activity browser. Worth remembering as an example of confirming domain
  meaning before building, not after.
- **Overlays over full pages:** Add/Remove Student and Add/Delete Class
  started as full-page confirmation screens (matching the existing kiosk
  flow's pattern), then were deliberately rebuilt as compact modal overlays
  after review — a full-page navigation felt too heavy for a two-button
  confirmation.
- **Bulk-select on Class Loans is intentionally a static mock**, not wired
  logic — flagged rather than faked, since this file has no existing
  pattern for conditional visibility and Figma's variable-bound-visibility
  only evaluates in Present mode, not on canvas.

## 03 — How I Got There / Process

- **2026-07-09** — First Lovable prototype tested with five real teachers:
  it looked "elegant" but nobody knew what to press — too much text, a
  cluttered progress bar. Rebuilt around one question: *if someone's
  half-distracted and a bit rushed, is this still obvious?* Confirmations
  became full-screen states, the few necessary buttons were enlarged,
  contrast was pushed above accessibility minimums with headroom to spare.
- **2026-07-10** — Landing page restyled "after ramp.com": lime accent
  (`#EAF22E`), tight 6px/10px radii replacing the old pill-radius look,
  Inter-only type. Decision confirmed explicitly with Dan: when Figma and
  code diverge, **code is the source of truth** going forward, not the
  original Figma frames — Figma gets brought back in sync with code, not
  the other way round.
- **2026-07-10** — Landing page CTA had stray scroll on tablets
  (`min-h-screen`/`100vh` overshoots the real visible viewport once browser
  chrome collapses). Fixed with `fixed inset-0` instead, which tracks the
  actual visual viewport — also happened to satisfy a "keep it fixed
  mid-screen" request as a side effect.
- **2026-07-10** — Multi-tenant Supabase schema shipped with a flagged,
  known security tradeoff: the spec called for reading `school_id` from
  `user_metadata`, which is client-editable and would let a compromised
  client cross tenant boundaries. Implemented as specified but called out
  `app_metadata` as the safer alternative before real users are on it —
  worth resurfacing if this moves toward production.
- **2026-07-15** — Portfolio hero screenshot: grabbed a real screenshot of
  the live deployed app rather than a Figma mock, to show the actual shipped
  product. First version used an iPad portrait frame; changed to landscape
  per feedback, and fixed a grey-corner artifact caused by the mockup's
  drop-shadow bleeding to the image edge with no margin to fade into —
  fixed by adding a white margin buffer around the device frame before
  rendering.
- **2026-07-15** — Removed the "Who has it & when it's due" line from the
  Checked Out step of the scan-flow diagram, and cut the Scan screenshot
  from the 4-up screens grid down to 3 — simplification pass, not a content
  gap.

- **2026-07-15** — Wired up "Add to catalogue" on the Not in Catalogue
  screen, which surfaced a much bigger latent bug: the app had **no auth at
  all**, so every RLS tenant-isolation policy blocked the anon key
  completely — reads and writes. In practice this meant every scan showed
  "Not in Catalogue" regardless of whether the book was already in the
  database, since `get_user_school_id()` always evaluated to null with no
  signed-in user. Confirmed by querying the live REST API directly with the
  anon key (`books`/`schools` both returned `[]`), then confirmed the whole
  database was genuinely empty via `supabase db dump`.
  Fix: since this is a shared kiosk tablet with no per-user login concept
  anywhere in the design (not a stopgap — that's the actual intended model),
  bootstrap one anonymous Supabase session per device, tagged with a single
  fixed `school_id` via `user_metadata` — the same mechanism the schema's
  SECURITY NOTE already flagged, just never connected client-side. Seeded
  one `schools` row ("Demo School") via a new migration and enabled
  anonymous sign-in on the project (was off by default).
  **Gotcha along the way:** `auth.updateUser()` changes the stored user
  record, but the *current* session's JWT — which RLS reads `school_id`
  from — was already issued at sign-in and doesn't include the new claim
  until the session is explicitly refreshed. Found this by watching a raw
  insert fail with a `42501` RLS error even right after tagging the
  metadata; `supabase.auth.refreshSession()` after `updateUser()` fixed it.
  A missing/unknown book now falls back to a placeholder title
  (`Book <barcode>`) when the external Open Library lookup finds nothing,
  since `books.title` is `NOT NULL` and there's no manual-entry UI yet —
  flagged as a rough edge, not a finished flow.
  Verified end-to-end in a real browser, not just typechecked: generated an
  actual EAN-13 barcode image, fed it to Chromium as a fake camera device,
  and drove the full scan → not-in-catalogue → add → available flow against
  the live Supabase project.

## Screens Worth Keeping

- Hero: live landing page, landscape iPad frame.
- Actual screens (3-up): Not in Catalogue, Available, Checked Out result
  screens (`images/library-lite-*.png` in the danmorgan repo).

---

*New entries go above this line, dated, under whichever section they belong
to. Log the decision and the "why" at the moment it's made — not after.*

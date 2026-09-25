---
paths:
  - "src/components/**/*.tsx"
  - "src/pages/**/*.tsx"
  - "src/app/**/*.tsx"
  - "src/styles/**/*.css"
---
# Design System & UI Specification: Library Lite

## 1. Product Context & System Intent
- **Product:** Classroom book cataloging & library management web application designed primarily for tablet and desktop interfaces.
- **Audience:** Primary school teachers and young students managing classroom libraries.
- **Aesthetic Persona:** Warm, clean, approachable, highly legible, and tactile. High-contrast surfaces reduce cognitive load in busy primary classroom environments.

---

## 2. Color Tokens & Material Role Mapping

All colors map to semantic CSS variables or Tailwind classes to ensure consistent surface-to-text contrast.

| Material Role | Token Name | Tailwind Utility | Hex / Fallback | Usage / Intent |
| :--- | :--- | :--- | :--- | :--- |
| **`surface`** | `--color-bg-canvas` | `bg-amber-50/40` | `#fdfbf7` | Soft, warm paper-like canvas background |
| **`surface-container`** | `--color-bg-card` | `bg-white` | `#ffffff` | Book cards, search panels, and modal surfaces |
| **`on-surface`** | `--color-text-main` | `text-slate-900` | `#0f172a` | High-contrast body text and headings |
| **`on-surface-variant`**| `--color-text-muted` | `text-slate-600` | `#475569` | Metadata (ISBN, Author, Level/Phase) |
| **`primary`** | `--color-brand-primary`| `bg-emerald-600` | `#059669` | Primary actions (Scan, Check Out, Add Book) |
| **`on-primary`** | `--color-on-primary` | `text-white` | `#ffffff` | Primary button labels and icon fills |
| **`secondary-container`**| `--color-accent-subtle`| `bg-amber-100` | `#fef3c7` | Category badges, reading band highlights |
| **`on-secondary`** | `--color-on-secondary` | `text-amber-900` | `#78350f` | Text on category tags and reading band badges |
| **`outline-variant`** | `--color-border-subtle` | `border-slate-200` | `#e2e8f0` | Card borders and input field outlines |

---

## 3. Typography & Spacing Scale

### Typography Stack
- **Primary Font:** Clean, friendly sans-serif (`Plus Jakarta Sans`, `Inter`, `system-ui`).
- **Heading Scale:** Bold, rounded hierarchy (`tracking-tight text-slate-900`).
- **Metadata:** Monospace numeric display (`font-mono`) reserved for ISBNs and barcode values.

### Layout & Surface Rules
- **Tablet Touch Targets:** Interactive targets (buttons, card triggers) must maintain a minimum target size of `48x48px` (`min-h-[48px] min-w-[48px]`).
- **Corner Radius:**
  - Book Cover Cards & Containers: `rounded-xl` (`12px`)
  - Badges & Scan Triggers: `rounded-full`
  - Action Modals & Drawers: `rounded-2xl` (`16px`)
- **Elevation / Shadows:** Cards use light, warm elevation (`shadow-sm hover:shadow-md transition-shadow`).

---

## 4. Key Component Patterns

### Book Cover Grid Card (`src/components/books/BookCard.tsx`)
```tsx
<div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
  <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-100">
    <img 
      src={book.coverUrl} 
      alt={`Cover of ${book.title}`} 
      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" 
    />
  </div>
  <div className="mt-3 flex flex-col gap-1">
    <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
      {book.readingLevel}
    </span>
    <h3 className="line-clamp-1 font-semibold text-slate-900">{book.title}</h3>
    <p className="line-clamp-1 text-sm text-slate-600">{book.author}</p>
  </div>
</div>

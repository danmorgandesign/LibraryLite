import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  // Positioned off the real header element rather than a hardcoded offset,
  // since the header's height isn't fixed — it wraps onto extra lines on
  // narrow/portrait viewports.
  anchorRef: RefObject<HTMLElement | null>;
};

const ITEMS = [
  { label: 'My Profile', to: '/profile' },
  // No School page yet — rendered as an inert row rather than a NavLink so
  // it doesn't take part in route matching (a NavLink to="#" resolves to
  // the current path under HashRouter, so it would show as "active" on
  // every page).
  { label: 'School', to: null },
  { label: 'Classes', to: '/classes' },
  { label: 'Teachers', to: '/teachers' },
  { label: 'Books', to: '/books' },
  { label: 'Students', to: '/students' },
];

// Slide-in drawer matching the Figma "NAV-01 Hamburger Menu" reference
// (white card, border + shadow, rounded corners, horizontal dividers
// between rows). The prototype's own transition direction (slide up from
// the bottom) reads as a mismatched choice from the prototyping tool rather
// than a deliberate final decision — a right-edge slide is the standard,
// sensible implementation of a hamburger drawer, so that's what this does.
//
// Rendered via a portal straight into <body>, rather than nested inside
// <Header>: the header has `backdrop-blur` (a CSS backdrop-filter), and a
// backdrop-filter on an ancestor makes it the containing block for any
// `position: fixed` descendant — so the overlay was only covering the
// header's own box instead of the whole viewport. Portaling escapes that
// entirely instead of relying on no ancestor ever gaining a filter/
// transform/backdrop-filter in the future.
export default function HamburgerMenu({ isOpen, onClose, anchorRef }: Props) {
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    function measure() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setPanelPos({ top: rect.bottom, right: window.innerWidth - rect.right });
    }
    if (isOpen) {
      measure();
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
  }, [isOpen, anchorRef]);

  return createPortal(
    <>
      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 z-20 bg-ink-primary/20 transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={panelPos ? { top: panelPos.top, right: panelPos.right + 20 } : undefined}
        className={`fixed z-30 w-[252px] rounded-md border border-line bg-surface shadow-lg transition-transform ${
          isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-[calc(100%+24px)]'
        }`}
      >
        <div className="flex items-center justify-end border-b border-line px-md py-sm">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex min-h-[44px] min-w-[34px] items-center justify-center rounded-sm text-lg font-medium text-ink-primary hover:bg-surface-subtle"
          >
            ✕
          </button>
        </div>
        <nav aria-label="Menu" className="flex flex-col">
          {ITEMS.map((item, i) =>
            item.to === null ? (
              <span
                key={item.label}
                aria-disabled="true"
                className={`flex min-h-[44px] items-center justify-end px-md py-sm text-sm font-medium text-ink-muted ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center justify-end px-md py-sm text-sm font-medium ${
                    i > 0 ? 'border-t border-line' : ''
                  } ${isActive ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-primary'}`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      </div>
    </>,
    document.body,
  );
}

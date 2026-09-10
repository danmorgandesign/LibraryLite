import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  // Positioned off the real header element rather than a hardcoded offset,
  // since the header's height isn't fixed — it wraps onto extra lines on
  // narrow/portrait viewports. Anchoring to the header as a whole (rather
  // than the button specifically) keeps the panel clear of all wrapped
  // content regardless of where the button ends up sitting.
  anchorRef: RefObject<HTMLElement | null>;
};

const ITEMS = [
  { label: 'My Profile', to: '/profile' },
  { label: 'School', to: '/school' },
  { label: 'Classes', to: '/classes' },
  { label: 'Teachers', to: '/teachers' },
  { label: 'Books', to: '/books' },
  { label: 'Students', to: '/students' },
];

// Panel fades in at its final position (no slide) — the hamburger button
// itself toggles to an "X" in Header.tsx, in the exact same spot, so there's
// no separate close button inside the panel.
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
      if (rect) setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right + 20 });
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
        style={panelPos ? { top: panelPos.top, right: panelPos.right } : undefined}
        className={`fixed z-30 w-[252px] rounded-md border border-line bg-surface shadow-lg transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <nav aria-label="Menu" className="flex flex-col">
          {ITEMS.map((item, i) => (
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
          ))}
        </nav>
      </div>
    </>,
    document.body,
  );
}

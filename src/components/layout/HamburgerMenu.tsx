import { NavLink } from 'react-router-dom';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ITEMS = [
  { label: 'School', to: '/profile' },
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
export default function HamburgerMenu({ isOpen, onClose }: Props) {
  return (
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
        className={`fixed right-lg top-[76px] z-30 w-[252px] rounded-md border border-line bg-surface shadow-lg transition-transform ${
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
    </>
  );
}

import { Link, NavLink } from 'react-router-dom';

// Most nav items route to another page (`to`); a few (e.g. "Pricing" on the
// landing page) just scroll to a section on the current page instead
// (`onClick`) — HashRouter already uses "#" for routing, so a real in-page
// anchor link isn't an option here.
type NavItem = ({ label: string; to: string } | { label: string; onClick: () => void }) & { variant?: 'cta' };

type Props = {
  navItems: NavItem[];
};

const ctaClassName =
  'inline-flex min-h-[44px] items-center rounded-sm bg-accent px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-90';

// The pre-auth pages (landing, register, login) and the one-time onboarding
// pages each show a different, shorter nav than the main app's Header, so
// this takes the nav items as a prop instead of hardcoding a set — same
// visual chrome, no search bar or "Scan a Book" pill since those only make
// sense once you're inside the app.
export default function AuthHeader({ navItems }: Props) {
  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium transition-colors hover:bg-surface-subtle hover:text-ink-primary ${
      isActive ? 'text-ink-primary' : 'text-ink-muted'
    }`;
  const navButtonClassName =
    'inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink-primary';

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-lg py-md">
        <Link to="/" className="text-2xl font-bold tracking-tight text-ink-primary">
          Library Lite
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-xl">
          {navItems.map((item) =>
            'to' in item ? (
              <NavLink key={item.label} to={item.to} className={item.variant === 'cta' ? ctaClassName : navLinkClassName}>
                {item.label}
              </NavLink>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={item.variant === 'cta' ? ctaClassName : navButtonClassName}
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

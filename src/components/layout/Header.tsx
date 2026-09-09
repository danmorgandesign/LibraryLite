import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  // The dashboard has its own "Scan Book" action card, so the header pill
  // would just duplicate it there.
  const hasOwnScanCta = location.pathname === '/dashboard';

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium transition-colors hover:bg-surface-subtle hover:text-ink-primary ${
      isActive ? 'text-ink-primary' : 'text-ink-muted'
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-md px-lg py-md lg:flex-nowrap lg:justify-between">
        <Link to="/dashboard" className="shrink-0 font-sans text-2xl font-bold tracking-tight text-ink-primary lg:text-3xl">
          Library Lite
        </Link>

        <div className="order-3 w-full lg:order-2 lg:w-auto lg:max-w-sm lg:flex-1 lg:px-xl">
          <label htmlFor="book-search" className="sr-only">
            Search books
          </label>
          <input
            id="book-search"
            type="search"
            placeholder="Search books…"
            className="w-full rounded-md border border-line bg-surface px-md py-xs text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
        </div>

        <nav aria-label="Primary" className="order-2 ml-auto flex shrink-0 items-center gap-xl lg:order-3 lg:ml-0">
          {/* There's no real per-session login yet (see the note in
              supabaseClient.ts), so this just routes back to the login
              screen rather than actually clearing a session. */}
          <button type="button" onClick={() => navigate('/login')} className={navLinkClassName({ isActive: false })}>
            Logout
          </button>
          <NavLink to="/dashboard" className={navLinkClassName}>
            Dashboard
          </NavLink>
          {!hasOwnScanCta && (
            <Link
              to="/scan"
              className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-lg text-sm font-medium text-ink-primary transition-opacity hover:opacity-90"
            >
              Scan a Book
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="inline-flex min-h-[44px] min-w-[38px] items-center justify-center rounded-sm text-lg text-ink-primary hover:bg-surface-subtle"
          >
            ☰
          </button>
        </nav>
      </div>

      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

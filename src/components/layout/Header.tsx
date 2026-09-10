import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth';

async function fetchSchoolName(schoolId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('schools').select('name').eq('id', schoolId).single();
  if (error) throw error;
  return data.name;
}

export default function Header() {
  const navigate = useNavigate();
  const { teacher } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!teacher) return;
    let cancelled = false;
    // Best-effort: a failure here just leaves the name blank rather than
    // taking the whole header down.
    fetchSchoolName(teacher.school_id)
      .then((name) => {
        if (!cancelled) setSchoolName(name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [teacher]);

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium transition-colors hover:bg-surface-subtle hover:text-ink-primary ${
      isActive ? 'text-ink-primary' : 'text-ink-muted'
    }`;

  return (
    <header
      ref={headerRef}
      // Bumped above the hamburger menu's own dimming backdrop (z-20) only
      // while it's open — otherwise the backdrop (which covers the full
      // viewport) sits above the header and blocks clicks on the toggle
      // button, which doubles as the menu's close button. Stays at the
      // normal z-10 the rest of the time so it doesn't also float above
      // unrelated full-screen modals elsewhere in the app (e.g. Manage
      // Teachers' Add/Edit overlays, also z-20).
      className={`sticky top-0 border-b border-line bg-surface/95 backdrop-blur ${menuOpen ? 'z-30' : 'z-10'}`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-md px-lg py-md lg:flex-nowrap lg:justify-between">
        <Link to="/dashboard" className="shrink-0">
          <span className="block font-sans text-2xl font-bold tracking-tight text-ink-primary lg:text-3xl">
            Library Lite
          </span>
          {schoolName && <span className="block text-xs text-ink-muted">{schoolName}</span>}
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
          <button
            type="button"
            onClick={async () => {
              await getSupabaseClient().auth.signOut();
              navigate('/login');
            }}
            className={navLinkClassName({ isActive: false })}
          >
            Logout
          </button>
          <NavLink to="/dashboard" className={navLinkClassName}>
            Dashboard
          </NavLink>
          <Link
            to="/scan"
            className="inline-flex min-h-[44px] items-center rounded-full bg-accent px-lg text-sm font-medium text-ink-primary transition-opacity hover:opacity-90"
          >
            Scan a Book
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="inline-flex min-h-[44px] min-w-[38px] items-center justify-center rounded-sm text-lg text-ink-primary hover:bg-surface-subtle"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </nav>
      </div>

      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={headerRef} />
    </header>
  );
}

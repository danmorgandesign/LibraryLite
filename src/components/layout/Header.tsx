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

type BookSuggestion = { id: string; title: string; author: string | null; coverUrl: string | null };

const SUGGESTION_LIMIT = 5;

// Escapes ILIKE wildcards so a literal % or _ in the query doesn't act as a
// pattern operator, and strips characters with special meaning in
// PostgREST's .or() filter syntax (`,()`) — neither is meaningful in a
// plain title/author search, so dropping them is simpler than encoding them.
function toIlikePattern(raw: string): string {
  const sanitized = raw.replace(/[,()]/g, '');
  const escaped = sanitized.replace(/[%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

async function searchBooks(query: string): Promise<BookSuggestion[]> {
  const supabase = getSupabaseClient();
  const pattern = toIlikePattern(query);
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, cover_url')
    .or(`title.ilike.${pattern},author.ilike.${pattern}`)
    .order('title')
    .limit(SUGGESTION_LIMIT);
  if (error) throw error;
  return data.map((b) => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.cover_url }));
}

export default function Header() {
  const navigate = useNavigate();
  const { teacher } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  // Anchored to the centered content wrapper, not the full-bleed <header>
  // itself — the header has no max-width, so its own rect.right is the
  // viewport edge, which on desktop is well past the visible content's
  // right edge (the wrapper below is centered via mx-auto max-w-6xl). This
  // div still wraps onto extra rows on narrow viewports same as before, so
  // its rect still grows to clear all wrapped content.
  const contentRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Debounced live search — waits for a pause in typing rather than firing
  // a query per keystroke.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(() => {
      searchBooks(trimmed)
        .then((results) => {
          if (cancelled) return;
          setSuggestions(results);
          setSearchOpen(true);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const goToBook = (book: BookSuggestion) => {
    navigate('/books', { state: { selectedBookId: book.id } });
    setSearchQuery('');
    setSearchOpen(false);
  };

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-[44px] items-center rounded-sm px-sm text-sm font-medium transition-colors hover:bg-surface-subtle hover:text-ink-primary ${
      isActive ? 'text-ink-primary' : 'text-ink-muted'
    }`;

  return (
    <header
      // Bumped above the hamburger menu's own dimming backdrop (z-20) only
      // while it's open — otherwise the backdrop (which covers the full
      // viewport) sits above the header and blocks clicks on the toggle
      // button, which doubles as the menu's close button. Stays at the
      // normal z-10 the rest of the time so it doesn't also float above
      // unrelated full-screen modals elsewhere in the app (e.g. Manage
      // Teachers' Add/Edit overlays, also z-20).
      className={`sticky top-0 border-b border-line bg-surface/95 backdrop-blur ${menuOpen ? 'z-30' : 'z-10'}`}
    >
      <div
        ref={contentRef}
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-md px-lg py-md lg:flex-nowrap lg:justify-between"
      >
        <Link to="/dashboard" className="shrink-0">
          <span className="block font-sans text-2xl font-bold tracking-tight text-ink-primary lg:text-3xl">
            Library Lite
          </span>
          {schoolName && <span className="block text-xs text-ink-muted">{schoolName}</span>}
        </Link>

        <div className="order-3 w-full lg:order-2 lg:w-auto lg:max-w-sm lg:flex-1 lg:px-xl">
          <div ref={searchContainerRef} className="relative">
            <label htmlFor="book-search" className="sr-only">
              Search books
            </label>
            <input
              id="book-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setSearchOpen(true);
              }}
              placeholder="Search books…"
              autoComplete="off"
              role="combobox"
              aria-expanded={searchOpen}
              aria-controls="book-search-suggestions"
              className="w-full rounded-md border border-line bg-surface px-md py-xs text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            {searchOpen && (
              <div
                id="book-search-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full z-20 mt-xs overflow-hidden rounded-md border border-line bg-surface shadow-lg"
              >
                {searchLoading && <p className="px-md py-sm text-sm text-ink-muted">Searching…</p>}
                {!searchLoading && suggestions.length === 0 && (
                  <p className="px-md py-sm text-sm text-ink-muted">No books found.</p>
                )}
                {!searchLoading &&
                  suggestions.map((book, i) => (
                    <button
                      key={book.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => goToBook(book)}
                      className={`flex w-full items-center gap-sm px-md py-sm text-left hover:bg-surface-subtle ${
                        i > 0 ? 'border-t border-line' : ''
                      }`}
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt=""
                          className="h-[28px] w-[20px] shrink-0 rounded-sm bg-surface-subtle object-cover"
                        />
                      ) : (
                        <div className="h-[28px] w-[20px] shrink-0 rounded-sm bg-surface-subtle" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-primary">{book.title}</p>
                        {book.author && <p className="truncate text-xs text-ink-muted">{book.author}</p>}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
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

      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} anchorRef={contentRef} />
    </header>
  );
}

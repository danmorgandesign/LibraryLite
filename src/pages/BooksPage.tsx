import { useEffect, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import BookDetailModal from '../components/BookDetailModal';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type BookStatus = 'available' | 'on-loan';

type Book = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: BookStatus;
};

const PAGE_SIZE = 10;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'on-loan', label: 'On Loan' },
  { key: 'available', label: 'Available' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const TABLE_GRID_COLS = 'sm:grid-cols-[51px_1fr_1fr_110px]';

function StatusBadge({ status }: { status: BookStatus }) {
  const isAvailable = status === 'available';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-self-start rounded-full border px-md py-xs text-xs font-medium ${
        isAvailable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {isAvailable ? 'AVAILABLE' : 'ON LOAN'}
    </span>
  );
}

async function fetchBooks(): Promise<Book[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();

  // Embedded resource query: pulls each book's active (unreturned) loans
  // alongside it in one round trip, so status can be derived client-side
  // without an N+1 query per row.
  const { data, error } = await supabase
    .from('books')
    .select('id, title, author, cover_url, loans(id, returned_at)')
    .is('retired_at', null)
    .order('title');

  if (error) throw error;

  return data.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.cover_url,
    status: book.loans.some((loan) => loan.returned_at === null) ? 'on-loan' : 'available',
  }));
}

async function retireBook(bookId: string): Promise<void> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('books').update({ retired_at: new Date().toISOString() }).eq('id', bookId);
  if (error) throw error;
}

type Props = {
  onScan: () => void;
  onClassesClick: () => void;
};

export default function BooksPage({ onScan, onClassesClick }: Props) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBooks()
      .then((data) => {
        if (!cancelled) setBooks(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load books.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = books === null && !error;

  const filteredBooks = useMemo(
    () => (books ?? []).filter((book) => filter === 'all' || book.status === filter),
    [books, filter],
  );

  const pageCount = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleBooks = filteredBooks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (key: FilterKey) => {
    setFilter(key);
    setPage(1);
  };

  return (
    <>
      <Header activeItem="books" onScan={onScan} onClassesClick={onClassesClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex gap-[3px] rounded-md bg-surface-subtle p-[3px]">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleFilterChange(key)}
                aria-pressed={filter === key}
                className={`rounded-sm px-md py-xs text-sm font-medium transition-colors ${
                  filter === key ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-lg">
            <div
              className={`hidden gap-lg border-b border-line pb-sm text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid sm:items-center ${TABLE_GRID_COLS}`}
            >
              <span aria-hidden="true" />
              <span>Title</span>
              <span>Author</span>
              <span>Status</span>
            </div>

            {isLoading && <p className="py-lg text-sm text-ink-muted">Loading books…</p>}
            {error && <p className="py-lg text-sm text-red-600">{error}</p>}

            {!isLoading &&
              !error &&
              visibleBooks.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBook(book)}
                  className={`flex w-full items-center gap-lg border-b border-line py-sm text-left transition-colors hover:bg-surface-subtle sm:grid ${TABLE_GRID_COLS}`}
                >
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="h-[34px] w-[51px] shrink-0 rounded-sm bg-surface-subtle object-cover"
                    />
                  ) : (
                    <div className="h-[34px] w-[51px] shrink-0 rounded-sm bg-surface-subtle" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">{book.title}</p>
                    <p className="truncate text-sm text-ink-muted sm:hidden">{book.author}</p>
                  </div>
                  <p className="hidden min-w-0 truncate text-sm text-ink-muted sm:block">{book.author}</p>
                  <StatusBadge status={book.status} />
                </button>
              ))}

            {!isLoading && !error && visibleBooks.length === 0 && (
              <p className="py-lg text-sm text-ink-muted">No books match this filter.</p>
            )}
          </div>

          <div className="mt-md flex items-center justify-between text-sm text-ink-muted">
            <p>
              Showing {visibleBooks.length} of {filteredBooks.length}
            </p>

            <div className="flex items-center gap-sm">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="font-medium disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                  className={`flex size-[21px] items-center justify-center rounded-sm text-xs font-medium ${
                    pageNumber === currentPage ? 'bg-ink-primary text-white' : 'text-ink-primary hover:bg-surface-subtle'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                className="font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onRetire={async (bookId) => {
            await retireBook(bookId);
            setBooks((prev) => (prev ?? []).filter((b) => b.id !== bookId));
            setSelectedBook(null);
          }}
        />
      )}
    </>
  );
}

import { useMemo, useState } from 'react';
import Header from '../components/layout/Header';

type BookStatus = 'available' | 'on-loan';

type Book = {
  title: string;
  author: string;
  status: BookStatus;
};

// Placeholder catalogue — matches the Figma "09 Books" table content until
// this reads from the real `books`/`loans` tables (see ScanBookPage).
const DUMMY_BOOKS: Book[] = [
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', status: 'available' },
  { title: '1984', author: 'George Orwell', status: 'on-loan' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', status: 'available' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', status: 'available' },
  { title: 'Moby-Dick', author: 'Herman Melville', status: 'on-loan' },
  { title: 'War and Peace', author: 'Leo Tolstoy', status: 'available' },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', status: 'on-loan' },
  { title: 'Brave New World', author: 'Aldous Huxley', status: 'available' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', status: 'available' },
  { title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', status: 'on-loan' },
  { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', status: 'available' },
  { title: 'Jane Eyre', author: 'Charlotte Brontë', status: 'on-loan' },
  { title: 'Wuthering Heights', author: 'Emily Brontë', status: 'available' },
  { title: 'The Odyssey', author: 'Homer', status: 'available' },
  { title: 'Frankenstein', author: 'Mary Shelley', status: 'on-loan' },
];

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

export default function BooksPage({ onScan }: { onScan: () => void }) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);

  const filteredBooks = useMemo(
    () => (filter === 'all' ? DUMMY_BOOKS : DUMMY_BOOKS.filter((book) => book.status === filter)),
    [filter],
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
      <Header activeItem="books" onScan={onScan} />

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

            {visibleBooks.map((book) => (
              <div
                key={book.title}
                className={`flex items-center gap-lg border-b border-line py-sm sm:grid ${TABLE_GRID_COLS}`}
              >
                <div className="h-[34px] w-[51px] shrink-0 rounded-sm bg-surface-subtle" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">{book.title}</p>
                  <p className="truncate text-sm text-ink-muted sm:hidden">{book.author}</p>
                </div>
                <p className="hidden min-w-0 truncate text-sm text-ink-muted sm:block">{book.author}</p>
                <StatusBadge status={book.status} />
              </div>
            ))}

            {visibleBooks.length === 0 && <p className="py-lg text-sm text-ink-muted">No books match this filter.</p>}
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
    </>
  );
}

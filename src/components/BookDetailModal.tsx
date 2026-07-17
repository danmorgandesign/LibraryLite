import { useState } from 'react';

type BookStatus = 'available' | 'on-loan';

type Student = { id: string; first_name: string; last_initial: string | null };

type Book = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  status: BookStatus;
  borrower: (Student & { classroomLabel: string }) | null;
};

type Props = {
  book: Book;
  onClose: () => void;
  onRetire: (bookId: string) => Promise<void>;
  onStudentClick: (student: Student) => void;
};

function formatName(student: Student) {
  return student.last_initial ? `${student.first_name} ${student.last_initial}.` : student.first_name;
}

function StatusBadge({ status }: { status: BookStatus }) {
  const isAvailable = status === 'available';
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-md py-xs text-xs font-medium ${
        isAvailable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {isAvailable ? 'AVAILABLE' : 'ON LOAN'}
    </span>
  );
}

export default function BookDetailModal({ book, onClose, onRetire, onStudentClick }: Props) {
  const [isConfirmingRetire, setIsConfirmingRetire] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetire = async () => {
    setIsRetiring(true);
    setError(null);
    try {
      await onRetire(book.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retire this book.');
      setIsRetiring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-lg">
      <div className="relative flex min-h-[480px] w-full max-w-2xl flex-col rounded-md bg-surface pb-2xl pl-2xl pr-xl pt-xl shadow-lg">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-lg top-lg flex size-11 items-center justify-center text-xl font-medium text-ink-primary"
        >
          ✕
        </button>

        <div className="flex flex-1 items-center justify-center gap-2xl">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt=""
              className="h-[224px] w-[160px] shrink-0 rounded-md bg-surface-subtle object-contain"
            />
          ) : (
            <div className="h-[224px] w-[160px] shrink-0 rounded-md bg-surface-subtle" aria-hidden="true" />
          )}

          <div className="flex max-w-sm flex-col gap-sm">
            <h1 className="text-2xl font-semibold text-ink-primary">{book.title}</h1>
            {book.author && <p className="text-base text-ink-muted">{book.author}</p>}
            <StatusBadge status={book.status} />
            {book.status === 'on-loan' && book.borrower && (
              <p className="text-sm text-ink-muted">
                Checked out by{' '}
                <button
                  type="button"
                  onClick={() => onStudentClick(book.borrower!)}
                  className="font-medium text-ink-primary underline-offset-2 hover:underline"
                >
                  {formatName(book.borrower)}
                </button>{' '}
                · {book.borrower.classroomLabel}
              </p>
            )}

            <div className="mt-lg">
              {error && <p className="mb-sm text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={() => setIsConfirmingRetire(true)}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-rose-700 transition-opacity hover:opacity-80"
              >
                Retire Book
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConfirmingRetire && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-lg">
          <div className="w-full max-w-sm rounded-md bg-surface p-xl shadow-lg">
            <h2 className="text-lg font-semibold text-ink-primary">Retire Book?</h2>
            <p className="mt-xs text-sm text-ink-muted">
              This will mark the book as retired and remove it from the active catalogue.
            </p>
            <div className="mt-lg flex justify-end gap-sm">
              <button
                type="button"
                onClick={() => setIsConfirmingRetire(false)}
                disabled={isRetiring}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRetire}
                disabled={isRetiring}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-rose-300 bg-surface px-md text-sm font-medium text-rose-700 disabled:opacity-60"
              >
                {isRetiring ? 'Retiring…' : 'Retire Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

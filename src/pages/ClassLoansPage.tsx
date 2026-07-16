import { useMemo, useState } from 'react';
import Header from '../components/layout/Header';

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
  onBack: () => void;
};

type LoanStatus = 'Overdue' | 'On Loan';

type Loan = {
  id: string;
  title: string;
  borrowedBy: string;
  dueDate: string;
  status: LoanStatus;
};

// Placeholder loan list — matches the Figma "Class Loans" table until this
// reads from a real `loans` table (see BooksPage for the same pattern).
const INITIAL_LOANS: Loan[] = [
  { id: '1', title: "Charlotte's Web", borrowedBy: 'Ava', dueDate: '2026-06-28', status: 'Overdue' },
  { id: '2', title: 'The Gruffalo', borrowedBy: 'Noah', dueDate: '2026-07-02', status: 'Overdue' },
  { id: '3', title: 'Matilda', borrowedBy: 'Isla', dueDate: '2026-07-06', status: 'Overdue' },
  { id: '4', title: 'Where the Wild Things Are', borrowedBy: 'Leo', dueDate: '2026-07-10', status: 'On Loan' },
  { id: '5', title: 'The Very Hungry Caterpillar', borrowedBy: 'Mia', dueDate: '2026-07-12', status: 'On Loan' },
  { id: '6', title: 'Goodnight Mister Tom', borrowedBy: 'Oscar', dueDate: '2026-07-14', status: 'On Loan' },
  { id: '7', title: 'The Secret Garden', borrowedBy: 'Freya', dueDate: '2026-07-16', status: 'On Loan' },
  { id: '8', title: 'James and the Giant Peach', borrowedBy: 'Jack', dueDate: '2026-07-18', status: 'On Loan' },
  { id: '9', title: 'The BFG', borrowedBy: 'Amelia', dueDate: '2026-07-20', status: 'On Loan' },
  { id: '10', title: 'Fantastic Mr Fox', borrowedBy: 'Harry', dueDate: '2026-07-22', status: 'On Loan' },
];

const SORT_OPTIONS = [
  { key: 'dueDate', label: 'Due Date' },
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Title (A–Z)' },
  { key: 'borrowedBy', label: 'Student Name (A–Z)' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: LoanStatus }) {
  const isOverdue = status === 'Overdue';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-md py-xs text-xs font-medium ${
        isOverdue ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      {status}
    </span>
  );
}

export default function ClassLoansPage({ onScan, onBooksClick, onBack }: Props) {
  const [loans, setLoans] = useState(INITIAL_LOANS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const sortedLoans = useMemo(() => {
    const copy = [...loans];
    copy.sort((a, b) => {
      if (sortBy === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === 'status') return a.status === b.status ? 0 : a.status === 'Overdue' ? -1 : 1;
      return a[sortBy].localeCompare(b[sortBy]);
    });
    return copy;
  }, [loans, sortBy]);

  const allSelected = loans.length > 0 && selected.size === loans.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(loans.map((l) => l.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const returnLoans = (ids: string[]) => {
    setLoans((prev) => prev.filter((l) => !ids.includes(l.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)!.label;

  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-primary"
          >
            ← Back to Classes
          </button>

          <div className="mt-lg flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-ink-primary">Class Loans</h1>
              <p className="mt-xs text-sm text-ink-muted">Showing {loans.length} book loans for this class.</p>
            </div>

            <div className="relative flex items-center gap-sm">
              <span className="text-sm text-ink-muted">Sort by</span>
              <button
                type="button"
                onClick={() => setSortMenuOpen((v) => !v)}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary"
              >
                {sortLabel} ▾
              </button>
              {sortMenuOpen && (
                <div className="absolute right-0 top-full z-10 mt-xs w-52 rounded-md border border-line bg-surface py-xs shadow-lg">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.key);
                        setSortMenuOpen(false);
                      }}
                      className={`block w-full px-md py-sm text-left text-sm hover:bg-surface-subtle ${
                        opt.key === sortBy ? 'font-medium text-ink-primary' : 'text-ink-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => returnLoans(Array.from(selected))}
              className="mt-lg inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white"
            >
              Return Selected ({selected.size})
            </button>
          )}

          <div className="mt-lg">
            <div className="hidden grid-cols-[24px_1fr_1fr_110px_90px_90px] items-center gap-lg border-b border-line pb-sm text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4" />
              <span>Title</span>
              <span>Borrowed By</span>
              <span>Due Date</span>
              <span>Status</span>
              <span aria-hidden="true" />
            </div>

            {sortedLoans.map((loan) => (
              <div
                key={loan.id}
                className="grid grid-cols-[24px_1fr_1fr_110px_90px_90px] items-center gap-lg border-b border-line py-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(loan.id)}
                  onChange={() => toggleOne(loan.id)}
                  className="size-4"
                />
                <p className="truncate text-sm font-medium text-ink-primary">{loan.title}</p>
                <p className="truncate text-sm text-ink-muted">{loan.borrowedBy}</p>
                <p className="text-sm text-ink-muted">{formatDate(loan.dueDate)}</p>
                <StatusBadge status={loan.status} />
                <button
                  type="button"
                  onClick={() => returnLoans([loan.id])}
                  className="inline-flex min-h-[36px] items-center justify-self-start rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                >
                  Return
                </button>
              </div>
            ))}

            {loans.length === 0 && <p className="py-lg text-sm text-ink-muted">No active loans for this class.</p>}
          </div>
        </div>
      </main>
    </>
  );
}

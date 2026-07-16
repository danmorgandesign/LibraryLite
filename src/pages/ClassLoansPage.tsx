import { useEffect, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type Student = { id: string; first_name: string; last_initial: string | null };

type Props = {
  classroomId: string;
  classroomLabel: string;
  onScan: () => void;
  onBooksClick: () => void;
  onClassesClick: () => void;
  onStudentsClick: () => void;
  onStudentClick: (student: Student) => void;
  onBack: () => void;
};

type LoanStatus = 'Overdue' | 'On Loan';

type Loan = {
  id: string;
  bookId: string;
  title: string;
  student: Student;
  borrowedBy: string;
  dueDate: Date;
  status: LoanStatus;
};

// The schema has no due_date column — loans are due 3 weeks after they're
// checked out (the loan window this app was designed around), so it's
// computed from the real loaned_at timestamp rather than stored.
const LOAN_WINDOW_DAYS = 21;

const SORT_OPTIONS = [
  { key: 'dueDate', label: 'Due Date' },
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Title (A–Z)' },
  { key: 'borrowedBy', label: 'Student Name (A–Z)' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

async function fetchActiveLoans(classroomId: string): Promise<Loan[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('loans')
    .select('id, loaned_at, book_id, books(title), students!inner(id, first_name, last_initial, classroom_id)')
    .eq('students.classroom_id', classroomId)
    .is('returned_at', null);

  if (error) throw error;

  const now = Date.now();
  // Supabase's untyped client infers embedded to-one relations as arrays
  // (it can't see the FK cardinality without generated DB types) — at
  // runtime these are single objects, so cast rather than fight the types.
  return (data as unknown as Array<{
    id: string;
    loaned_at: string;
    book_id: string;
    books: { title: string } | null;
    students: { id: string; first_name: string; last_initial: string | null } | null;
  }>).map((loan) => {
    const dueDate = new Date(new Date(loan.loaned_at).getTime() + LOAN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const student = loan.students ?? { id: '', first_name: 'Unknown student', last_initial: null };
    return {
      id: loan.id,
      bookId: loan.book_id,
      title: loan.books?.title ?? 'Unknown title',
      student,
      borrowedBy: student.first_name,
      dueDate,
      status: dueDate.getTime() < now ? 'Overdue' as const : 'On Loan' as const,
    };
  });
}

async function markReturned(loanIds: string[]): Promise<void> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('loans')
    .update({ returned_at: new Date().toISOString() })
    .in('id', loanIds);
  if (error) throw error;
}

export default function ClassLoansPage({ classroomId, classroomLabel, onScan, onBooksClick, onClassesClick, onStudentsClick, onStudentClick, onBack }: Props) {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchActiveLoans(classroomId)
      .then((data) => {
        if (!cancelled) setLoans(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load loans.');
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  const isLoading = loans === null && !loadError;

  const sortedLoans = useMemo(() => {
    const copy = [...(loans ?? [])];
    copy.sort((a, b) => {
      if (sortBy === 'dueDate') return a.dueDate.getTime() - b.dueDate.getTime();
      if (sortBy === 'status') return a.status === b.status ? 0 : a.status === 'Overdue' ? -1 : 1;
      return a[sortBy].localeCompare(b[sortBy]);
    });
    return copy;
  }, [loans, sortBy]);

  const allSelected = (loans ?? []).length > 0 && selected.size === loans!.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set((loans ?? []).map((l) => l.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const returnLoans = async (ids: string[]) => {
    setIsReturning(true);
    setActionError(null);
    try {
      await markReturned(ids);
      setLoans((prev) => (prev ?? []).filter((l) => !ids.includes(l.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not return the selected loan(s).');
    } finally {
      setIsReturning(false);
    }
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)!.label;

  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} onClassesClick={onClassesClick} onStudentsClick={onStudentsClick} />

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
              <p className="mt-xs text-sm text-ink-muted">
                {isLoading ? `Loading loans for ${classroomLabel}…` : `Showing ${(loans ?? []).length} book loans for ${classroomLabel}.`}
              </p>
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

          {loadError && <p className="mt-lg text-sm text-red-600">{loadError}</p>}
          {actionError && <p className="mt-lg text-sm text-red-600">{actionError}</p>}

          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => returnLoans(Array.from(selected))}
              disabled={isReturning}
              className="mt-lg inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white disabled:opacity-60"
            >
              {isReturning ? 'Returning…' : `Return Selected (${selected.size})`}
            </button>
          )}

          {isLoading && <p className="mt-lg text-sm text-ink-muted">Loading loans…</p>}

          {!isLoading && !loadError && (
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
                  <button
                    type="button"
                    onClick={() => onStudentClick(loan.student)}
                    className="truncate text-left text-sm text-ink-muted underline-offset-2 hover:underline"
                  >
                    {loan.borrowedBy}
                  </button>
                  <p className="text-sm text-ink-muted">{formatDate(loan.dueDate)}</p>
                  <StatusBadge status={loan.status} />
                  <button
                    type="button"
                    onClick={() => returnLoans([loan.id])}
                    disabled={isReturning}
                    className="inline-flex min-h-[36px] items-center justify-self-start rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80 disabled:opacity-60"
                  >
                    Return
                  </button>
                </div>
              ))}

              {sortedLoans.length === 0 && <p className="py-lg text-sm text-ink-muted">No active loans for this class.</p>}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

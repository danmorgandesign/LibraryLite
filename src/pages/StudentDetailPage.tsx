import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type Student = { id: string; first_name: string; last_initial: string | null };

type Props = {
  student: Student;
  onScan: () => void;
  onBooksClick: () => void;
  onClassesClick: () => void;
  onBack: () => void;
};

type CurrentLoan = {
  id: string;
  title: string;
  dueDate: Date;
  status: 'Overdue' | 'On Loan';
};

type PastLoan = {
  id: string;
  title: string;
  returnedAt: Date;
};

// The schema has no due_date column — loans are due 3 weeks after they're
// checked out (matches the loan window used on Class Loans), so it's
// computed from loaned_at rather than stored.
const LOAN_WINDOW_DAYS = 21;

function formatName(student: Student) {
  return student.last_initial ? `${student.first_name} ${student.last_initial}.` : student.first_name;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: CurrentLoan['status'] }) {
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

async function fetchLoanHistory(studentId: string): Promise<{ current: CurrentLoan[]; history: PastLoan[] }> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('loans')
    .select('id, loaned_at, returned_at, books(title)')
    .eq('student_id', studentId)
    .order('loaned_at', { ascending: false });

  if (error) throw error;

  const now = Date.now();
  const rows = data as unknown as Array<{ id: string; loaned_at: string; returned_at: string | null; books: { title: string } | null }>;

  const current: CurrentLoan[] = [];
  const history: PastLoan[] = [];

  for (const row of rows) {
    const title = row.books?.title ?? 'Unknown title';
    if (row.returned_at === null) {
      const dueDate = new Date(new Date(row.loaned_at).getTime() + LOAN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      current.push({ id: row.id, title, dueDate, status: dueDate.getTime() < now ? 'Overdue' : 'On Loan' });
    } else {
      history.push({ id: row.id, title, returnedAt: new Date(row.returned_at) });
    }
  }

  return { current, history };
}

async function markReturned(loanId: string): Promise<void> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('loans').update({ returned_at: new Date().toISOString() }).eq('id', loanId);
  if (error) throw error;
}

export default function StudentDetailPage({ student, onScan, onBooksClick, onClassesClick, onBack }: Props) {
  const [current, setCurrent] = useState<CurrentLoan[] | null>(null);
  const [history, setHistory] = useState<PastLoan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLoanHistory(student.id)
      .then(({ current, history }) => {
        if (!cancelled) {
          setCurrent(current);
          setHistory(history);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load loan history.');
      });
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  const isLoading = current === null && !loadError;

  const handleReturn = async (loanId: string) => {
    setReturningId(loanId);
    setActionError(null);
    try {
      await markReturned(loanId);
      const returned = current!.find((l) => l.id === loanId)!;
      setCurrent((prev) => (prev ?? []).filter((l) => l.id !== loanId));
      setHistory((prev) => [{ id: returned.id, title: returned.title, returnedAt: new Date() }, ...(prev ?? [])]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not return this book.');
    } finally {
      setReturningId(null);
    }
  };

  return (
    <>
      <Header activeItem="students" onScan={onScan} onBooksClick={onBooksClick} onClassesClick={onClassesClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-ink-muted transition-colors hover:text-ink-primary"
          >
            ← Back to Students
          </button>

          <h1 className="mt-lg text-2xl font-semibold text-ink-primary">{formatName(student)}</h1>
          <p className="mt-xs text-sm text-ink-muted">Loan history for this student.</p>

          {loadError && <p className="mt-lg text-sm text-red-600">{loadError}</p>}
          {actionError && <p className="mt-lg text-sm text-red-600">{actionError}</p>}
          {isLoading && <p className="mt-lg text-sm text-ink-muted">Loading loan history…</p>}

          {!isLoading && !loadError && (
            <>
              <p className="mt-xl text-xs font-semibold uppercase tracking-wide text-ink-muted">Current Loans</p>
              <div className="mt-sm">
                {current!.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between gap-lg border-b border-line py-sm">
                    <p className="min-w-0 truncate text-sm font-medium text-ink-primary">{loan.title}</p>
                    <p className="shrink-0 text-sm text-ink-muted">Due {formatDate(loan.dueDate)}</p>
                    <StatusBadge status={loan.status} />
                    <button
                      type="button"
                      onClick={() => handleReturn(loan.id)}
                      disabled={returningId === loan.id}
                      className="inline-flex min-h-[36px] shrink-0 items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80 disabled:opacity-60"
                    >
                      {returningId === loan.id ? 'Returning…' : 'Return'}
                    </button>
                  </div>
                ))}
                {current!.length === 0 && <p className="py-sm text-sm text-ink-muted">No current loans.</p>}
              </div>

              <p className="mt-xl text-xs font-semibold uppercase tracking-wide text-ink-muted">Loan History</p>
              <div className="mt-sm">
                {history!.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between gap-lg border-b border-line py-sm">
                    <p className="min-w-0 truncate text-sm font-medium text-ink-primary">{loan.title}</p>
                    <p className="shrink-0 text-sm text-ink-muted">Returned {formatDate(loan.returnedAt)}</p>
                  </div>
                ))}
                {history!.length === 0 && <p className="py-sm text-sm text-ink-muted">No past loans yet.</p>}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type StudentSummary = {
  id: string;
  name: string;
  loanCount: number;
  overdueCount: number;
};

// Loans have no due_date column — due 3 weeks after loaned_at, matching the
// window used everywhere else this is computed (Students, Class Loans,
// Student Detail).
const LOAN_WINDOW_DAYS = 21;

function formatName(first: string, lastInitial: string | null) {
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

async function fetchRoster(): Promise<StudentSummary[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_initial, loans(returned_at, loaned_at)')
    .order('first_name');

  if (error) throw error;

  const now = Date.now();
  return (data as unknown as Array<{
    id: string;
    first_name: string;
    last_initial: string | null;
    loans: Array<{ returned_at: string | null; loaned_at: string }>;
  }>).map((s) => {
    const activeLoans = s.loans.filter((l) => l.returned_at === null);
    const overdueCount = activeLoans.filter(
      (l) => new Date(l.loaned_at).getTime() + LOAN_WINDOW_DAYS * 24 * 60 * 60 * 1000 < now,
    ).length;
    return {
      id: s.id,
      name: formatName(s.first_name, s.last_initial),
      loanCount: activeLoans.length,
      overdueCount,
    };
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState<StudentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRoster()
      .then((data) => {
        if (!cancelled) setRoster(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the class roster.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = roster === null && !error;

  return (
    <>
      <Header />

      <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/classes')}
              className="flex flex-col items-center gap-sm rounded-md border border-line bg-surface p-lg text-center shadow-sm transition-opacity hover:opacity-90"
            >
              <span className="text-lg font-semibold text-ink-primary">View Class</span>
              <span className="text-sm text-ink-muted">See class rosters and loan activity.</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="flex flex-col items-center gap-sm rounded-md border border-line bg-surface p-lg text-center shadow-sm transition-opacity hover:opacity-90"
            >
              <span className="text-lg font-semibold text-ink-primary">Scan Book</span>
              <span className="text-sm text-ink-muted">Scan a barcode to loan or return a book.</span>
            </button>
          </div>

          <p className="mt-xl text-xs font-semibold uppercase tracking-wide text-ink-muted">Class Roster</p>

          {isLoading && <p className="mt-sm text-sm text-ink-muted">Loading roster…</p>}
          {error && <p className="mt-sm text-sm text-red-600">{error}</p>}

          {!isLoading && !error && (
            <div className="mt-sm grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-6">
              {roster!.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="flex flex-col gap-xs rounded-sm border border-line bg-surface p-sm text-left transition-opacity hover:opacity-80"
                >
                  <span className="truncate text-sm font-medium text-ink-primary">{student.name}</span>
                  <span
                    className={`inline-flex w-fit items-center rounded-lg border px-md py-xs text-xs font-bold ${
                      student.overdueCount > 0
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : student.loanCount > 0
                          ? 'border-blue-600 bg-blue-50 text-blue-800'
                          : 'border-gray-400 bg-surface-subtle text-ink-muted'
                    }`}
                  >
                    {student.overdueCount > 0
                      ? `${student.overdueCount} overdue`
                      : student.loanCount > 0
                        ? `${student.loanCount} on loan`
                        : 'No loans'}
                  </span>
                </button>
              ))}

              {roster!.length === 0 && <p className="col-span-full text-sm text-ink-muted">No students yet.</p>}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

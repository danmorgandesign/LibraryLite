import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type Student = { id: string; first_name: string; last_initial: string | null };
type StudentRow = Student & {
  classroomId: string | null;
  classroomLabel: string;
  loanCount: number;
  hasOverdue: boolean;
};
type Classroom = { id: string; class_label: string };

// The schema has no due_date column — loans are due 3 weeks after they're
// checked out (matches the loan window used on Class Loans/Student Detail),
// so overdue is computed from loaned_at rather than stored.
const LOAN_WINDOW_DAYS = 21;

const SORT_OPTIONS = [
  { key: 'alphabet', label: 'Alphabetical (A-Z)' },
  { key: 'class', label: 'Class' },
  { key: 'loans', label: 'Books on Loan' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

function formatName(student: Student) {
  return student.last_initial ? `${student.first_name} ${student.last_initial}.` : student.first_name;
}

async function fetchClassrooms(): Promise<Classroom[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('classrooms').select('id, class_label').order('class_label');
  if (error) throw error;
  return data;
}

async function fetchStudents(): Promise<StudentRow[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_initial, classroom_id, classrooms(class_label), loans(returned_at, loaned_at)')
    .order('first_name');

  if (error) throw error;

  const now = Date.now();

  // Supabase's untyped client infers embedded to-one relations as arrays
  // (it can't see the FK cardinality without generated DB types) — at
  // runtime `classrooms` is a single object, so cast rather than fight the
  // types. `loans` is a genuine one-to-many relation, so it stays an array.
  return (data as unknown as Array<{
    id: string;
    first_name: string;
    last_initial: string | null;
    classroom_id: string | null;
    classrooms: { class_label: string } | null;
    loans: Array<{ returned_at: string | null; loaned_at: string }>;
  }>).map((s) => {
    const activeLoans = s.loans.filter((l) => l.returned_at === null);
    return {
      id: s.id,
      first_name: s.first_name,
      last_initial: s.last_initial,
      classroomId: s.classroom_id,
      classroomLabel: s.classrooms?.class_label ?? 'Unassigned',
      loanCount: activeLoans.length,
      hasOverdue: activeLoans.some(
        (l) => new Date(l.loaned_at).getTime() + LOAN_WINDOW_DAYS * 24 * 60 * 60 * 1000 < now,
      ),
    };
  });
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const goToStudent = (student: Student) => navigate(`/students/${student.id}`);
  // The initial class filter arrives as a query param (e.g. clicking a class
  // name on the Classes page links to /students?class=<id>) rather than
  // route state, so a direct link or a refresh still lands pre-filtered.
  const [searchParams] = useSearchParams();
  const initialClassroomId = searchParams.get('class') ?? undefined;

  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeClassroomIds, setActiveClassroomIds] = useState<Set<string>>(
    () => new Set(initialClassroomId ? [initialClassroomId] : []),
  );
  const [sortBy, setSortBy] = useState<SortKey>('alphabet');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchClassrooms(), fetchStudents()])
      .then(([classroomData, studentData]) => {
        if (!cancelled) {
          setClassrooms(classroomData);
          setStudents(studentData);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load students.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = students === null && !error;

  const toggleClassroom = (id: string) => {
    setActiveClassroomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleStudents = useMemo(() => {
    if (!students) return [];
    const byClassroom =
      activeClassroomIds.size === 0
        ? students
        : students.filter((s) => s.classroomId && activeClassroomIds.has(s.classroomId));

    const query = search.trim().toLowerCase();
    const filtered = query ? byClassroom.filter((s) => formatName(s).toLowerCase().includes(query)) : byClassroom;

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'class') {
        const byClass = a.classroomLabel.localeCompare(b.classroomLabel);
        return byClass !== 0 ? byClass : a.first_name.localeCompare(b.first_name);
      }
      if (sortBy === 'loans') {
        const byCount = b.loanCount - a.loanCount;
        return byCount !== 0 ? byCount : a.first_name.localeCompare(b.first_name);
      }
      return a.first_name.localeCompare(b.first_name);
    });
    return sorted;
  }, [students, activeClassroomIds, sortBy, search]);

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)!.label;

  return (
    <>
      <Header />

      <main className="min-h-screen px-lg pb-2xl lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary">Students</h1>
            <p className="mt-xs text-sm text-ink-muted">Every student across all classes.</p>
          </div>

          <div className="mt-lg flex items-center gap-md">
            <div className="max-w-sm flex-1">
              <label htmlFor="student-search" className="sr-only">
                Search students by name
              </label>
              <input
                id="student-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-md border border-line bg-surface px-md py-xs text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSortMenuOpen((v) => !v)}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary"
              >
                {sortLabel} ▾
              </button>
              {sortMenuOpen && (
                <div className="absolute right-0 top-full z-10 mt-xs w-48 rounded-md border border-line bg-surface py-xs shadow-lg">
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

          {!isLoading && !error && classrooms && classrooms.length > 0 && (
            <div className="mt-lg flex gap-sm overflow-x-auto pb-xs">
              {classrooms.map((classroom) => {
                const isActive = activeClassroomIds.has(classroom.id);
                return (
                  <button
                    key={classroom.id}
                    type="button"
                    onClick={() => toggleClassroom(classroom.id)}
                    aria-pressed={isActive}
                    className={`inline-flex min-h-[36px] shrink-0 items-center rounded-full border px-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-ink-primary bg-ink-primary text-white'
                        : 'border-line bg-surface text-ink-primary hover:bg-surface-subtle'
                    }`}
                  >
                    {classroom.class_label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-lg">
            <div className="hidden grid-cols-[1fr_1fr_120px_80px_90px] gap-lg border-b border-line pb-sm text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
              <span>Name</span>
              <span>Class</span>
              <span>Books on Loan</span>
              <span>Status</span>
              <span aria-hidden="true" />
            </div>

            {isLoading && <p className="py-lg text-sm text-ink-muted">Loading students…</p>}
            {error && <p className="py-lg text-sm text-red-600">{error}</p>}

            {!isLoading &&
              !error &&
              visibleStudents.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-1 items-center gap-xs border-b border-line py-sm sm:grid-cols-[1fr_1fr_120px_80px_90px] sm:gap-lg"
                >
                  <button
                    type="button"
                    onClick={() => goToStudent(student)}
                    className="w-fit text-left text-sm font-medium text-ink-primary underline-offset-2 hover:underline"
                  >
                    {formatName(student)}
                  </button>
                  <p className="text-sm text-ink-muted">{student.classroomLabel}</p>
                  <p className="text-sm text-ink-muted">{student.loanCount}</p>
                  <span
                    className={`inline-flex h-[27px] w-11 shrink-0 items-center justify-center rounded-lg border ${
                      student.hasOverdue ? 'border-rose-600 bg-rose-50' : 'border-emerald-600 bg-emerald-50'
                    }`}
                    title={student.hasOverdue ? 'Has overdue loans' : 'No overdue loans'}
                  >
                    <span className="sr-only">{student.hasOverdue ? 'Has overdue loans' : 'No overdue loans'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => goToStudent(student)}
                    className="inline-flex min-h-[36px] w-fit items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                  >
                    Details
                  </button>
                </div>
              ))}

            {!isLoading && !error && visibleStudents.length === 0 && (
              <p className="py-lg text-sm text-ink-muted">
                {search.trim()
                  ? 'No students match your search.'
                  : activeClassroomIds.size > 0
                    ? 'No students in the selected classes.'
                    : 'No students yet.'}
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

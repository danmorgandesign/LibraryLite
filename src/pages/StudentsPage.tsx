import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type Student = { id: string; first_name: string; last_initial: string | null };
type StudentRow = Student & { classroomLabel: string };

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
  onClassesClick: () => void;
  onStudentClick: (student: Student) => void;
};

function formatName(student: Student) {
  return student.last_initial ? `${student.first_name} ${student.last_initial}.` : student.first_name;
}

async function fetchStudents(): Promise<StudentRow[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_initial, classrooms(class_label)')
    .order('first_name');

  if (error) throw error;

  // Supabase's untyped client infers embedded to-one relations as arrays
  // (it can't see the FK cardinality without generated DB types) — at
  // runtime these are single objects, so cast rather than fight the types.
  return (data as unknown as Array<{
    id: string;
    first_name: string;
    last_initial: string | null;
    classrooms: { class_label: string } | null;
  }>).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_initial: s.last_initial,
    classroomLabel: s.classrooms?.class_label ?? 'Unassigned',
  }));
}

export default function StudentsPage({ onScan, onBooksClick, onClassesClick, onStudentClick }: Props) {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStudents()
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load students.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = students === null && !error;

  return (
    <>
      <Header activeItem="students" onScan={onScan} onBooksClick={onBooksClick} onClassesClick={onClassesClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-ink-primary">Students</h1>
          <p className="mt-xs text-sm text-ink-muted">Every student across all classes.</p>

          <div className="mt-lg">
            <div className="hidden grid-cols-[1fr_1fr] gap-lg border-b border-line pb-sm text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
              <span>Name</span>
              <span>Class</span>
            </div>

            {isLoading && <p className="py-lg text-sm text-ink-muted">Loading students…</p>}
            {error && <p className="py-lg text-sm text-red-600">{error}</p>}

            {!isLoading &&
              !error &&
              students!.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-1 items-center gap-xs border-b border-line py-sm sm:grid-cols-[1fr_1fr] sm:gap-lg"
                >
                  <button
                    type="button"
                    onClick={() => onStudentClick(student)}
                    className="w-fit text-left text-sm font-medium text-ink-primary underline-offset-2 hover:underline"
                  >
                    {formatName(student)}
                  </button>
                  <p className="text-sm text-ink-muted">{student.classroomLabel}</p>
                </div>
              ))}

            {!isLoading && !error && students!.length === 0 && (
              <p className="py-lg text-sm text-ink-muted">No students yet.</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

import { useEffect, useState } from 'react';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type Classroom = { id: string; class_label: string };
type Student = { id: string; first_name: string; last_initial: string };

type Props = {
  bookTitle: string;
  isLoaning: boolean;
  error: string | null;
  onConfirmLoan: (studentId: string) => void;
  onCancel: () => void;
};

export default function SelectClassAndStudentPage({ bookTitle, isLoaning, error, onConfirmLoan, onCancel }: Props) {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureTenantSession();
        const supabase = getSupabaseClient();
        const { data, error: fetchError } = await supabase.from('classrooms').select('id, class_label').order('class_label');
        if (fetchError) throw fetchError;
        if (cancelled) return;
        setClassrooms(data);
        if (data.length > 0) setSelectedClassroomId(data[0].id);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load classes.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) return;
    let cancelled = false;
    setStudents(null);
    setSelectedStudentId(null);
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error: fetchError } = await supabase
          .from('students')
          .select('id, first_name, last_initial')
          .eq('classroom_id', selectedClassroomId)
          .order('first_name');
        if (fetchError) throw fetchError;
        if (!cancelled) setStudents(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load students.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassroomId]);

  return (
    <div className="fixed inset-0 overflow-y-auto p-lg">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink-primary">Select Class & Student</h1>
        <p className="mt-xs text-base text-ink-muted">Who is "{bookTitle}" being loaned to?</p>

        {loadError && <p className="mt-md text-sm text-red-600">{loadError}</p>}

        <label className="mt-lg block">
          <span className="text-sm font-medium text-ink-primary">Class</span>
          <select
            value={selectedClassroomId ?? ''}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            disabled={!classrooms}
            className="mt-xs block w-full max-w-xs rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          >
            {!classrooms && <option>Loading…</option>}
            {classrooms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_label}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-lg text-sm font-medium text-ink-primary">Student</p>
        <div className="mt-sm grid grid-cols-2 gap-sm sm:grid-cols-3">
          {students?.map((s) => {
            const isSelected = s.id === selectedStudentId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStudentId(s.id)}
                className={`min-h-[44px] rounded-sm border px-md py-sm text-left text-sm font-medium transition-colors ${
                  isSelected ? 'border-ink-primary bg-ink-primary text-white' : 'border-line bg-surface text-ink-primary hover:bg-surface-subtle'
                }`}
              >
                {s.first_name} {s.last_initial}.
              </button>
            );
          })}
          {students && students.length === 0 && <p className="col-span-full text-sm text-ink-muted">No students in this class yet.</p>}
          {!students && <p className="col-span-full text-sm text-ink-muted">Loading students…</p>}
        </div>

        {error && <p className="mt-lg text-sm text-red-600">{error}</p>}

        <div className="mt-xl flex flex-col gap-xs">
          <button
            type="button"
            onClick={() => selectedStudentId && onConfirmLoan(selectedStudentId)}
            disabled={!selectedStudentId || isLoaning}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-ink-primary px-lg py-sm text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isLoaning ? 'Confirming…' : 'Confirm & loan'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoaning}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-sm border border-line bg-white px-lg py-sm text-base font-medium text-ink-primary disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient, getTenantSchoolId } from '../lib/supabaseClient';

type Props = {
  classroomId: string;
  classroomLabel: string;
  onScan: () => void;
  onBooksClick: () => void;
  onClassesClick: () => void;
  onBack: () => void;
};

type Student = { id: string; first_name: string; last_initial: string | null };

type Modal =
  | { type: 'add' }
  | { type: 'edit'; student: Student }
  | { type: 'remove'; student: Student }
  | { type: 'delete-class' }
  | null;

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-lg">
      <div className="w-full max-w-sm rounded-md bg-surface p-xl shadow-lg">{children}</div>
    </div>
  );
}

// First name only is the default — a last initial is optional, added just
// to disambiguate two children with the same first name in one class.
// "Ava" -> { first_name: "Ava", last_initial: null }
// "Ava M." or "Ava M" -> { first_name: "Ava", last_initial: "M" }
function parseName(input: string): { first_name: string; last_initial: string | null } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) return { first_name: trimmed, last_initial: null };
  const first_name = trimmed.slice(0, lastSpace).trim();
  if (!first_name) return null;
  const last_initial = trimmed.slice(lastSpace + 1).replace(/\.$/, '').trim().slice(0, 1) || null;
  return { first_name, last_initial };
}

function formatName(student: Student) {
  return student.last_initial ? `${student.first_name} ${student.last_initial}.` : student.first_name;
}

async function fetchStudents(classroomId: string): Promise<Student[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_initial')
    .eq('classroom_id', classroomId)
    .order('first_name');
  if (error) throw error;
  return data;
}

export default function ManageClassPage({ classroomId, classroomLabel, onScan, onBooksClick, onClassesClick, onBack }: Props) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [nameInput, setNameInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStudents(classroomId)
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load students.');
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  const isLoading = students === null && !loadError;

  const closeModal = () => {
    setModal(null);
    setNameInput('');
    setActionError(null);
  };

  const handleAdd = async () => {
    const parsed = parseName(nameInput);
    if (!parsed) {
      setActionError('Enter a name for the student.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await ensureTenantSession();
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('students')
        .insert({ school_id: getTenantSchoolId(), classroom_id: classroomId, ...parsed })
        .select('id, first_name, last_initial')
        .single();
      if (error) throw error;
      setStudents((prev) => [...(prev ?? []), data].sort((a, b) => a.first_name.localeCompare(b.first_name)));
      closeModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (modal?.type !== 'edit') return;
    const parsed = parseName(nameInput);
    if (!parsed) {
      setActionError('Enter a name for the student.');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await ensureTenantSession();
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('students').update(parsed).eq('id', modal.student.id);
      if (error) throw error;
      setStudents((prev) => (prev ?? []).map((s) => (s.id === modal.student.id ? { ...s, ...parsed } : s)));
      closeModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (modal?.type !== 'remove') return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await ensureTenantSession();
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('students').delete().eq('id', modal.student.id);
      if (error) throw error;
      setStudents((prev) => (prev ?? []).filter((s) => s.id !== modal.student.id));
      closeModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await ensureTenantSession();
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('classrooms').delete().eq('id', classroomId);
      if (error) throw error;
      onBack();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete class.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} onClassesClick={onClassesClick} />

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
              <h1 className="text-2xl font-semibold text-ink-primary">Manage Class</h1>
              <p className="mt-xs text-sm text-ink-muted">Manage {classroomLabel}'s student roster.</p>
            </div>
            <button
              type="button"
              onClick={() => setModal({ type: 'delete-class' })}
              className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-rose-700 transition-opacity hover:opacity-80"
            >
              Delete Class
            </button>
          </div>

          <div className="mt-xl flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Students</p>
            <button
              type="button"
              onClick={() => setModal({ type: 'add' })}
              className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
            >
              + Add Student
            </button>
          </div>

          {isLoading && <p className="mt-lg text-sm text-ink-muted">Loading students…</p>}
          {loadError && <p className="mt-lg text-sm text-red-600">{loadError}</p>}

          {!isLoading && !loadError && (
            <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {students!.map((student) => (
                <div key={student.id} className="flex flex-col gap-md rounded-md border border-line bg-surface p-lg shadow-sm">
                  <p className="text-lg font-medium text-ink-primary">{formatName(student)}</p>
                  <div className="flex flex-wrap gap-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(formatName(student));
                        setModal({ type: 'edit', student });
                      }}
                      className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'remove', student })}
                      className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-rose-700 transition-opacity hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {students!.length === 0 && <p className="text-sm text-ink-muted">No students in this class yet.</p>}
            </div>
          )}
        </div>
      </main>

      {modal?.type === 'add' && (
        <Modal>
          <h2 className="text-lg font-semibold text-ink-primary">Add Student</h2>
          <p className="mt-xs text-sm text-ink-muted">Enter a name for the new student.</p>
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="First name, or First L. if needed"
            className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
          {actionError && <p className="mt-sm text-sm text-red-600">{actionError}</p>}
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={handleAdd} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? 'Adding…' : 'Add Student'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal>
          <h2 className="text-lg font-semibold text-ink-primary">Edit Student</h2>
          <p className="mt-xs text-sm text-ink-muted">Update the student's name.</p>
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="First name, or First L. if needed"
            className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
          {actionError && <p className="mt-sm text-sm text-red-600">{actionError}</p>}
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={handleSaveEdit} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'remove' && (
        <Modal>
          <h2 className="text-lg font-semibold text-ink-primary">Remove Student?</h2>
          <p className="mt-xs text-sm text-ink-muted">{formatName(modal.student)} will be removed from this class's roster.</p>
          {actionError && <p className="mt-sm text-sm text-red-600">{actionError}</p>}
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={handleRemove} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-rose-300 bg-surface px-md text-sm font-medium text-rose-700 disabled:opacity-60">
              {isSubmitting ? 'Removing…' : 'Remove Student'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'delete-class' && (
        <Modal>
          <h2 className="text-lg font-semibold text-ink-primary">Delete Class?</h2>
          <p className="mt-xs text-sm text-ink-muted">This will permanently delete the class, its roster, and its loan history.</p>
          {actionError && <p className="mt-sm text-sm text-red-600">{actionError}</p>}
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60">
              Cancel
            </button>
            <button type="button" onClick={handleDeleteClass} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-rose-300 bg-surface px-md text-sm font-medium text-rose-700 disabled:opacity-60">
              {isSubmitting ? 'Deleting…' : 'Delete Class'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

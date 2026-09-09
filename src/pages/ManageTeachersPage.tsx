import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient, getTenantSchoolId } from '../lib/supabaseClient';

type Teacher = {
  id: string;
  name: string | null;
  email: string | null;
  classroomId: string | null;
  classroomLabel: string | null;
  activatedAt: string | null;
};

type Classroom = { id: string; class_label: string };

function mapTeacherRow(row: {
  id: string;
  name: string | null;
  email: string | null;
  activated_at: string | null;
  classroom_id: string | null;
  classrooms: { class_label: string } | null;
}): Teacher {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    classroomId: row.classroom_id,
    classroomLabel: row.classrooms?.class_label ?? null,
    activatedAt: row.activated_at,
  };
}

const TEACHER_SELECT = 'id, name, email, activated_at, classroom_id, classrooms(class_label)';

async function fetchTeachers(): Promise<Teacher[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('teachers').select(TEACHER_SELECT).order('name');
  if (error) throw error;
  // Supabase's untyped client infers the embedded to-one `classrooms`
  // relation as an array (it can't see the FK cardinality without
  // generated DB types) — at runtime it's a single object, so cast rather
  // than fight the types.
  return (data as unknown as Parameters<typeof mapTeacherRow>[0][]).map(mapTeacherRow);
}

async function fetchClassrooms(): Promise<Classroom[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('classrooms').select('id, class_label').order('class_label');
  if (error) throw error;
  return data;
}

async function addTeacher(name: string, classroomId: string | null): Promise<Teacher> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('teachers')
    .insert({ school_id: getTenantSchoolId(), name, classroom_id: classroomId })
    .select(TEACHER_SELECT)
    .single();
  if (error) throw error;
  return mapTeacherRow(data as unknown as Parameters<typeof mapTeacherRow>[0]);
}

async function updateTeacher(id: string, name: string, classroomId: string | null): Promise<Teacher> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('teachers')
    .update({ name, classroom_id: classroomId })
    .eq('id', id)
    .select(TEACHER_SELECT)
    .single();
  if (error) throw error;
  return mapTeacherRow(data as unknown as Parameters<typeof mapTeacherRow>[0]);
}

async function removeTeacher(id: string): Promise<void> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;
}

type Modal = { type: 'add' } | { type: 'edit'; teacher: Teacher } | null;

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-lg">
      <div className="w-full max-w-sm rounded-md bg-surface p-xl shadow-lg">{children}</div>
    </div>
  );
}

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [nameInput, setNameInput] = useState('');
  const [classroomIdInput, setClassroomIdInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTeachers(), fetchClassrooms()])
      .then(([teacherData, classroomData]) => {
        if (!cancelled) {
          setTeachers(teacherData);
          setClassrooms(classroomData);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load teachers.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = teachers === null && !loadError;

  const closeModal = () => {
    setModal(null);
    setNameInput('');
    setClassroomIdInput('');
    setActionError(null);
  };

  const handleAdd = async () => {
    if (!nameInput.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const teacher = await addTeacher(nameInput.trim(), classroomIdInput || null);
      setTeachers((prev) =>
        [...(prev ?? []), teacher].sort((a, b) => (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '')),
      );
      closeModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add teacher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (modal?.type !== 'edit' || !nameInput.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await updateTeacher(modal.teacher.id, nameInput.trim(), classroomIdInput || null);
      setTeachers((prev) => (prev ?? []).map((t) => (t.id === updated.id ? updated : t)));
      closeModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update teacher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setActionError(null);
    try {
      await removeTeacher(id);
      setTeachers((prev) => (prev ?? []).filter((t) => t.id !== id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not remove teacher.');
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-ink-primary">Manage Teachers</h1>
          <p className="mt-xs text-sm text-ink-muted">Manage your school's teaching staff.</p>

          <div className="mt-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Teachers</p>
          </div>

          {isLoading && <p className="mt-lg text-sm text-ink-muted">Loading teachers…</p>}
          {loadError && <p className="mt-lg text-sm text-red-600">{loadError}</p>}

          {!isLoading && !loadError && (
            <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setModal({ type: 'add' })}
                className="flex flex-col items-center justify-center gap-md rounded-md border border-dashed border-line bg-surface-subtle/60 p-lg text-center transition-opacity hover:opacity-80"
              >
                <span className="text-xl font-semibold text-ink-primary">+</span>
                <span className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
                  Add Teacher
                </span>
              </button>

              {teachers!.map((teacher) => (
                <div key={teacher.id} className="flex flex-col gap-xs rounded-md border border-line bg-surface p-lg shadow-sm">
                  <p className="text-lg font-semibold text-ink-primary">
                    {teacher.name ?? teacher.email ?? 'Unnamed teacher'}
                  </p>
                  {teacher.name && teacher.email && <p className="text-sm text-ink-muted">{teacher.email}</p>}
                  {teacher.classroomLabel && <p className="text-sm text-ink-muted">Class: {teacher.classroomLabel}</p>}
                  {!teacher.activatedAt && <p className="text-sm font-medium text-amber-700">Awaiting Activation</p>}
                  <div className="mt-sm flex flex-wrap gap-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(teacher.name ?? '');
                        setClassroomIdInput(teacher.classroomId ?? '');
                        setModal({ type: 'edit', teacher });
                      }}
                      className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(teacher.id)}
                      className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-rose-700 transition-opacity hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modal?.type === 'add' && (
        <ModalShell>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            <h2 className="text-lg font-semibold text-ink-primary">Add Teacher</h2>
            <p className="mt-xs text-sm text-ink-muted">Enter the teacher's name and class.</p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Teacher name"
              className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            <select
              value={classroomIdInput}
              onChange={(e) => setClassroomIdInput(e.target.value)}
              className="mt-sm w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            >
              <option value="">No class assigned</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_label}
                </option>
              ))}
            </select>
            {actionError && <p className="mt-sm text-sm text-red-600">{actionError}</p>}
            <div className="mt-lg flex justify-end gap-sm">
              <button type="button" onClick={closeModal} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white disabled:opacity-60">
                {isSubmitting ? 'Adding…' : 'Add Teacher'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal?.type === 'edit' && (
        <ModalShell>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
          >
            <h2 className="text-lg font-semibold text-ink-primary">Edit Teacher</h2>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Teacher name"
              className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            <select
              value={classroomIdInput}
              onChange={(e) => setClassroomIdInput(e.target.value)}
              className="mt-sm w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            >
              <option value="">No class assigned</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_label}
                </option>
              ))}
            </select>
            {actionError && <p className="mt-sm text-sm text-red-600">{actionError}</p>}
            <div className="mt-lg flex justify-end gap-sm">
              <button type="button" onClick={closeModal} disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white disabled:opacity-60">
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

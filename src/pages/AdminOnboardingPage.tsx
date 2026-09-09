import { useEffect, useState } from 'react';
import AuthHeader from '../components/layout/AuthHeader';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth';

type Teacher = {
  id: string;
  name: string | null;
  email: string | null;
  classroomLabel: string | null;
  activatedAt: string | null;
};

const TEACHER_SELECT = 'id, name, email, activated_at, classroom_id, classrooms(class_label)';

function mapTeacherRow(row: {
  id: string;
  name: string | null;
  email: string | null;
  activated_at: string | null;
  classrooms: { class_label: string } | null;
}): Teacher {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    classroomLabel: row.classrooms?.class_label ?? null,
    activatedAt: row.activated_at,
  };
}

async function fetchTeachers(): Promise<Teacher[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('teachers').select(TEACHER_SELECT).order('created_at');
  if (error) throw error;
  // Supabase's untyped client infers the embedded to-one `classrooms`
  // relation as an array (it can't see the FK cardinality without
  // generated DB types) — at runtime it's a single object, so cast rather
  // than fight the types.
  return (data as unknown as Parameters<typeof mapTeacherRow>[0][]).map(mapTeacherRow);
}

// Finds an existing classroom by name (case-insensitive) or creates one —
// the "Class Name" fields here are free text since the class may not exist
// yet, unlike Manage Teachers' dropdown of already-real classrooms.
async function resolveClassroomId(schoolId: string, className: string): Promise<string> {
  const supabase = getSupabaseClient();
  const trimmed = className.trim();

  const { data: existing, error: findError } = await supabase
    .from('classrooms')
    .select('id, class_label')
    .ilike('class_label', trimmed)
    .limit(1);
  if (findError) throw findError;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error: createError } = await supabase
    .from('classrooms')
    // academic_year is NOT NULL with no natural default yet — there's no
    // year-picker UI anywhere in the app, so this hardcodes the current one
    // for now (matches ClassesPage's own "+ Add Class").
    .insert({ school_id: schoolId, class_label: trimmed, academic_year: '2025-2026' })
    .select('id')
    .single();
  if (createError) throw createError;
  return created.id;
}

async function inviteTeacher(schoolId: string, email: string, className: string): Promise<Teacher> {
  const supabase = getSupabaseClient();
  const classroomId = className.trim() ? await resolveClassroomId(schoolId, className) : null;

  const { data, error } = await supabase
    .from('teachers')
    .insert({ school_id: schoolId, email: email.trim(), classroom_id: classroomId })
    .select(TEACHER_SELECT)
    .single();
  if (error) throw error;
  return mapTeacherRow(data as unknown as Parameters<typeof mapTeacherRow>[0]);
}

// The admin's own teachers row already exists — register_school_and_admin
// created it at signup — so "I also teach a class" is an update of that
// row's classroom_id, not a new insert.
async function assignOwnClassroom(teacherId: string, schoolId: string, className: string): Promise<Teacher> {
  const supabase = getSupabaseClient();
  const classroomId = await resolveClassroomId(schoolId, className);

  const { data, error } = await supabase
    .from('teachers')
    .update({ classroom_id: classroomId })
    .eq('id', teacherId)
    .select(TEACHER_SELECT)
    .single();
  if (error) throw error;
  return mapTeacherRow(data as unknown as Parameters<typeof mapTeacherRow>[0]);
}

export default function AdminOnboardingPage() {
  // RequireAuth only redirects an admin away from here if they have no
  // teachers row at all, so `teacher` is guaranteed non-null by the time
  // this renders.
  const { teacher, refreshTeacher } = useAuth();

  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [teachesOwnClass, setTeachesOwnClass] = useState(false);
  const [ownClassName, setOwnClassName] = useState('');
  const [isAddingSelf, setIsAddingSelf] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);

  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherClassName, setTeacherClassName] = useState('');
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [addTeacherError, setAddTeacherError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTeachers()
      .then((data) => {
        if (!cancelled) setTeachers(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load teachers.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!teacher) return;
    let cancelled = false;
    getSupabaseClient()
      .from('schools')
      .select('name')
      .eq('id', teacher.school_id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setSchoolName(data?.name ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [teacher]);

  if (!teacher) return null;

  const handleAddSelf = async () => {
    if (!ownClassName.trim()) return;
    setIsAddingSelf(true);
    setSelfError(null);
    try {
      const updated = await assignOwnClassroom(teacher.id, teacher.school_id, ownClassName);
      setTeachers((prev) => [...(prev ?? []).filter((t) => t.id !== updated.id), updated]);
      await refreshTeacher();
      setOwnClassName('');
      setTeachesOwnClass(false);
    } catch (err) {
      setSelfError(err instanceof Error ? err.message : 'Could not add you as a teacher.');
    } finally {
      setIsAddingSelf(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!teacherEmail.trim()) return;
    setIsAddingTeacher(true);
    setAddTeacherError(null);
    try {
      const invited = await inviteTeacher(teacher.school_id, teacherEmail, teacherClassName);
      setTeachers((prev) => [...(prev ?? []), invited]);
      setTeacherEmail('');
      setTeacherClassName('');
    } catch (err) {
      setAddTeacherError(err instanceof Error ? err.message : 'Could not add this teacher.');
    } finally {
      setIsAddingTeacher(false);
    }
  };

  return (
    <>
      <AuthHeader
        navItems={[
          { label: 'Books', to: '/books' },
          { label: 'Classes', to: '/classes' },
          { label: 'Account', to: '/profile' },
        ]}
      />

      <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[28px] font-bold text-ink-primary">Welcome to Library Lite</h1>
          <p className="mt-xs text-base text-ink-muted">
            Let's get {schoolName || 'your school'} set up — add your teaching staff and classes to get started.
          </p>

          <div className="mt-xl rounded-md border border-line bg-surface p-lg">
            <p className="text-sm font-medium text-ink-primary">Are you also teaching a class?</p>
            {teacher.classroom_id ? (
              <p className="mt-md text-sm text-ink-muted">You're already set up teaching a class.</p>
            ) : (
              <>
                <div className="mt-md flex flex-wrap items-center gap-md">
                  <label className="flex items-center gap-sm text-sm text-ink-primary">
                    <input
                      type="checkbox"
                      checked={teachesOwnClass}
                      onChange={(e) => setTeachesOwnClass(e.target.checked)}
                      className="size-4"
                    />
                    I also teach a class
                  </label>
                  <input
                    value={ownClassName}
                    onChange={(e) => setOwnClassName(e.target.value)}
                    disabled={!teachesOwnClass || isAddingSelf}
                    placeholder="e.g. Squirrels"
                    className="min-h-[48px] w-[260px] max-w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={!teachesOwnClass || !ownClassName.trim() || isAddingSelf}
                    onClick={handleAddSelf}
                    className="inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-sm font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isAddingSelf ? 'Adding…' : 'Add'}
                  </button>
                </div>
                {selfError && <p className="mt-sm text-sm text-red-600">{selfError}</p>}
              </>
            )}
          </div>

          <div className="mt-lg flex flex-col items-center gap-xs rounded-md border border-line bg-surface p-2xl text-center">
            <h2 className="text-xl font-semibold text-ink-primary">Add Teachers</h2>
            <p className="text-sm text-ink-muted">Invite your teaching staff so they can set up their class and manage loans</p>
            <p className="text-sm text-ink-muted">
              {loadError
                ? loadError
                : !teachers
                  ? 'Loading…'
                  : teachers.length === 0
                    ? 'No teachers added yet'
                    : `${teachers.length} teacher${teachers.length === 1 ? '' : 's'} added`}
            </p>
          </div>

          <p className="mt-lg text-sm text-ink-muted">
            We don't send invite emails yet — ask the teacher to visit the Login page and choose "Invited by your
            school?", then sign up using this exact email address to be linked automatically. Class name is
            optional — they can add it themselves later.
          </p>

          <div className="mt-lg flex flex-wrap items-end gap-md">
            <label className="flex min-w-[280px] flex-1 flex-col gap-xs">
              <span className="text-sm font-medium text-ink-primary">
                Teacher Email <span className="text-red-600">*</span>
              </span>
              <input
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                disabled={isAddingTeacher}
                placeholder="e.g. jane.smith@riverbendprimary.co.uk"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <label className="flex min-w-[280px] flex-1 flex-col gap-xs">
              <span className="text-sm font-medium text-ink-primary">Class Name (optional)</span>
              <input
                value={teacherClassName}
                onChange={(e) => setTeacherClassName(e.target.value)}
                disabled={isAddingTeacher}
                placeholder="e.g. Squirrels"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <button
              type="button"
              onClick={handleAddTeacher}
              disabled={!teacherEmail.trim() || isAddingTeacher}
              className="inline-flex min-h-[47px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isAddingTeacher ? 'Adding…' : 'Add Teacher'}
            </button>
          </div>
          {addTeacherError && <p className="mt-sm text-sm text-red-600">{addTeacherError}</p>}

          {teachers && teachers.length > 0 && (
            <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((t) => (
                <div key={t.id} className="flex flex-col gap-xs rounded-md border border-line bg-surface p-lg">
                  <p className="font-semibold text-ink-primary">{t.name ?? t.email}</p>
                  {t.name && t.email && <p className="text-sm text-ink-muted">{t.email}</p>}
                  {t.classroomLabel && <p className="text-sm text-ink-muted">Class: {t.classroomLabel}</p>}
                  {!t.activatedAt && <p className="text-sm font-medium text-amber-700">Awaiting Activation</p>}
                  <div className="mt-sm flex gap-sm">
                    <button
                      type="button"
                      className="inline-flex min-h-[41px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-ink-primary"
                    >
                      Resend Email
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[41px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-ink-primary"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

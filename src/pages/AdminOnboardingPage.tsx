import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';
import { ensureTenantSession, getSupabaseClient, getTenantSchoolId } from '../lib/supabaseClient';

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
  await ensureTenantSession();
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
async function resolveClassroomId(className: string): Promise<string> {
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
    .insert({ school_id: getTenantSchoolId(), class_label: trimmed, academic_year: '2025-2026' })
    .select('id')
    .single();
  if (createError) throw createError;
  return created.id;
}

async function inviteTeacher(email: string, className: string): Promise<Teacher> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const classroomId = className.trim() ? await resolveClassroomId(className) : null;

  const { data, error } = await supabase
    .from('teachers')
    .insert({ school_id: getTenantSchoolId(), email: email.trim(), classroom_id: classroomId })
    .select(TEACHER_SELECT)
    .single();
  if (error) throw error;
  return mapTeacherRow(data as unknown as Parameters<typeof mapTeacherRow>[0]);
}

async function addSelfAsTeacher(name: string, className: string): Promise<Teacher> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const classroomId = await resolveClassroomId(className);

  const { data, error } = await supabase
    .from('teachers')
    // Already activated — this is the person currently completing
    // onboarding, not someone waiting on an invite email.
    .insert({ school_id: getTenantSchoolId(), name: name.trim(), classroom_id: classroomId, activated_at: new Date().toISOString() })
    .select(TEACHER_SELECT)
    .single();
  if (error) throw error;
  return mapTeacherRow(data as unknown as Parameters<typeof mapTeacherRow>[0]);
}

export default function AdminOnboardingPage() {
  const location = useLocation();
  const { schoolName, contactName } = (location.state as { schoolName?: string; contactName?: string } | null) ?? {};

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

  const handleAddSelf = async () => {
    if (!contactName || !ownClassName.trim()) return;
    setIsAddingSelf(true);
    setSelfError(null);
    try {
      const teacher = await addSelfAsTeacher(contactName, ownClassName);
      setTeachers((prev) => [...(prev ?? []), teacher]);
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
      const teacher = await inviteTeacher(teacherEmail, teacherClassName);
      setTeachers((prev) => [...(prev ?? []), teacher]);
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
            {teachesOwnClass && !contactName && (
              <p className="mt-sm text-sm text-ink-muted">
                Your name wasn't carried over from registration — this only works when arriving here from Register
                Yourself.
              </p>
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
            We'll email the teacher an invite link so they can set a password and get started. Class name is optional —
            they can add it themselves later.
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
              {teachers.map((teacher) => (
                <div key={teacher.id} className="flex flex-col gap-xs rounded-md border border-line bg-surface p-lg">
                  <p className="font-semibold text-ink-primary">{teacher.name ?? teacher.email}</p>
                  {teacher.name && teacher.email && <p className="text-sm text-ink-muted">{teacher.email}</p>}
                  {teacher.classroomLabel && <p className="text-sm text-ink-muted">Class: {teacher.classroomLabel}</p>}
                  {!teacher.activatedAt && <p className="text-sm font-medium text-amber-700">Awaiting Activation</p>}
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

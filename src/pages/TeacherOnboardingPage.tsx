import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth, type Teacher as TeacherProfile } from '../lib/auth';

type Student = { id: string; name: string };
type Classroom = { id: string; class_label: string };

const ONBOARDING_NAV = [
  { label: 'Books', to: '/books' },
  { label: 'Classes', to: '/classes' },
  { label: 'Account', to: '/profile' },
];

function SignUpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // emailRedirectTo overrides the dashboard's Site URL default (still
      // the unconfigured http://localhost:3000) — see the same fix on
      // ProfilePage's requestEmailChange.
      const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) throw signUpError;
      // If a session came back immediately, AuthProvider's auth-state
      // listener picks it up on its own and this form unmounts in favor of
      // the claim-invite step below — nothing else to do here in that case.
      if (!data.session) setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign up.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-lg pb-2xl pt-2xl">
      <form
        className="w-full max-w-xl rounded-md border border-line bg-surface p-2xl shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <h1 className="text-2xl font-semibold text-ink-primary">Set Up Your Teacher Account</h1>
        <p className="mt-xs text-sm text-ink-muted">Use the exact email address your school admin invited you with.</p>

        {checkEmail ? (
          <p className="mt-lg text-sm text-ink-primary">
            We've sent a confirmation link to <span className="font-medium">{email}</span>. Click it, then{' '}
            <button type="button" onClick={() => navigate('/login')} className="font-medium underline-offset-2 hover:underline">
              log in
            </button>{' '}
            to finish setting up your account.
          </p>
        ) : (
          <>
            <div className="mt-lg flex flex-col gap-md">
              <label className="flex flex-col gap-xs">
                <span className="text-sm font-medium text-ink-primary">
                  Email Address <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@yourschool.co.uk"
                  className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
                />
              </label>
              <label className="flex flex-col gap-xs">
                <span className="text-sm font-medium text-ink-primary">
                  Password <span className="text-red-600">*</span>
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
                />
              </label>
            </div>

            {error && <p className="mt-md text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-xl inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-accent px-lg py-sm text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating your account…' : 'Sign Up'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

function WithClass({ teacher }: { teacher: TeacherProfile }) {
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([{ id: 'seed', name: 'Ava Thompson' }]);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    if (!teacher.classroom_id) return;
    let cancelled = false;
    getSupabaseClient()
      .from('classrooms')
      .select('class_label')
      .eq('id', teacher.classroom_id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setClassLabel(data?.class_label ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [teacher.classroom_id]);

  const addStudent = () => {
    if (!studentName.trim()) return;
    setStudents((prev) => [...prev, { id: crypto.randomUUID(), name: studentName.trim() }]);
    setStudentName('');
  };

  return (
    <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-[28px] font-bold text-ink-primary">Welcome back, {teacher.name || 'there'}</h1>
        <p className="mt-xs text-base text-ink-muted">
          You're teaching {classLabel ?? 'your class'}. Add your students to get started.
        </p>

        <div className="mt-xl flex flex-col items-center gap-xs rounded-md border border-line bg-surface p-2xl text-center">
          <h2 className="text-xl font-semibold text-ink-primary">{classLabel ?? 'Your Class'}</h2>
          <p className="text-sm text-ink-muted">This is your class. Add your students below to start lending books.</p>
        </div>

        <p className="mt-lg text-sm text-ink-muted">Add each student's name below. You can edit or remove them anytime.</p>

        <div className="mt-lg flex flex-wrap items-end gap-md">
          <label className="flex min-w-[280px] flex-col gap-xs">
            <span className="text-sm font-medium text-ink-primary">
              Student Name <span className="text-red-600">*</span>
            </span>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Ava Thompson"
              className="min-h-[48px] w-[383px] max-w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
          </label>
          <button
            type="button"
            onClick={addStudent}
            disabled={!studentName.trim()}
            className="inline-flex min-h-[47px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Add Student
          </button>
        </div>

        <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <div key={student.id} className="flex flex-col gap-md rounded-md border border-line bg-surface p-lg">
              <p className="text-lg font-semibold text-ink-primary">{student.name}</p>
              <div className="flex gap-sm">
                <button type="button" className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-ink-primary">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setStudents((prev) => prev.filter((s) => s.id !== student.id))}
                  className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-rose-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function WithoutClass({ teacher, onClaimed }: { teacher: TeacherProfile; onClaimed: () => Promise<void> }) {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [claimSelection, setClaimSelection] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient()
      .from('classrooms')
      .select('id, class_label')
      .order('class_label')
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data as Classroom[] | null) ?? [];
        setClassrooms(rows);
        if (rows.length > 0) setClaimSelection(rows[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClaim = async () => {
    if (!claimSelection) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      const { error } = await getSupabaseClient().from('teachers').update({ classroom_id: claimSelection }).eq('id', teacher.id);
      if (error) throw error;
      await onClaimed();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Could not claim this class.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCreate = async () => {
    if (!newClassName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: created, error: createErr } = await supabase
        .from('classrooms')
        // academic_year is NOT NULL with no natural default yet — there's no
        // year-picker UI anywhere in the app, so this hardcodes the current
        // one for now (matches AdminOnboardingPage/ClassesPage's own "+ Add
        // Class").
        .insert({ school_id: teacher.school_id, class_label: newClassName.trim(), academic_year: '2025-2026' })
        .select('id')
        .single();
      if (createErr) throw createErr;
      const { error: updateErr } = await supabase.from('teachers').update({ classroom_id: created.id }).eq('id', teacher.id);
      if (updateErr) throw updateErr;
      await onClaimed();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create this class.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-[28px] font-bold text-ink-primary">Welcome to Library Lite</h1>
        <p className="mt-xs text-base text-ink-muted">
          You haven't been added to a class yet. Claim an existing class or create a new one to get started.
        </p>

        <div className="mt-xl grid grid-cols-1 gap-lg sm:grid-cols-2">
          <div className="flex flex-col items-start gap-md rounded-md border border-line bg-surface p-2xl">
            <h2 className="text-xl font-semibold text-ink-primary">Claim a Class</h2>
            <p className="text-sm text-ink-muted">Select a class that's already been set up for you.</p>
            {classrooms && classrooms.length === 0 ? (
              <p className="text-sm text-ink-muted">No classes yet — create one instead.</p>
            ) : (
              <select
                value={claimSelection}
                onChange={(e) => setClaimSelection(e.target.value)}
                disabled={!classrooms || isClaiming}
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              >
                {(classrooms ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_label}
                  </option>
                ))}
              </select>
            )}
            {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            <button
              type="button"
              onClick={handleClaim}
              disabled={!claimSelection || isClaiming}
              className="mt-xs inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isClaiming ? 'Claiming…' : 'Claim Class'}
            </button>
          </div>

          <div className="flex flex-col items-start gap-md rounded-md border border-line bg-surface p-2xl">
            <h2 className="text-xl font-semibold text-ink-primary">Create a New Class</h2>
            <p className="text-sm text-ink-muted">Set up a brand new class for your students.</p>
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              disabled={isCreating}
              placeholder="e.g. Bumblebees"
              className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newClassName.trim() || isCreating}
              className="mt-xs inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isCreating ? 'Creating…' : 'Create Class'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TeacherOnboardingPage() {
  const { user, teacher, loading, refreshTeacher } = useAuth();
  const navigate = useNavigate();

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Signed in but no teachers row yet — this is an invited teacher who
  // hasn't claimed their invite. Claim it automatically off their verified
  // email rather than making them do anything extra.
  useEffect(() => {
    if (loading || !user || teacher) return;
    let cancelled = false;
    setIsClaiming(true);
    setClaimError(null);
    getSupabaseClient()
      .rpc('claim_teacher_invite')
      .then(async ({ error }) => {
        if (cancelled) return;
        if (error) {
          setClaimError(error.message);
          setIsClaiming(false);
          return;
        }
        await refreshTeacher();
        if (!cancelled) setIsClaiming(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, teacher]);

  if (loading) return null;

  if (!user) {
    return (
      <>
        <AuthHeader navItems={ONBOARDING_NAV} />
        <SignUpForm />
      </>
    );
  }

  if (!teacher) {
    return (
      <>
        <AuthHeader navItems={ONBOARDING_NAV} />
        <main className="flex min-h-screen flex-col items-center justify-center gap-md px-lg text-center">
          {claimError ? (
            <>
              <p className="text-base font-medium text-ink-primary">Couldn't link your account</p>
              <p className="max-w-md text-sm text-ink-muted">
                No pending invite found for {user.email}. Ask your school admin to add you as a teacher using this
                exact email address, then try again.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await getSupabaseClient().auth.signOut();
                  navigate('/login');
                }}
                className="mt-sm inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-lg text-sm font-medium text-ink-primary"
              >
                Log Out
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">{isClaiming ? 'Linking your account…' : 'One moment…'}</p>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <AuthHeader navItems={ONBOARDING_NAV} />
      {teacher.classroom_id ? <WithClass teacher={teacher} /> : <WithoutClass teacher={teacher} onClaimed={refreshTeacher} />}
    </>
  );
}

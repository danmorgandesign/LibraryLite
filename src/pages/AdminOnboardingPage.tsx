import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AuthHeader from '../components/layout/AuthHeader';

type Teacher = {
  id: string;
  email: string;
  className: string | null;
};

// There's no `teachers` table in the schema yet (only classrooms/students/
// books/loans) and no real per-school tenancy behind this registration
// flow, so onboarding state here is local-only — it demonstrates the flow
// without writing fake rows into the one real demo school.
export default function AdminOnboardingPage() {
  const location = useLocation();
  const { schoolName, contactName } = (location.state as { schoolName?: string; contactName?: string } | null) ?? {};

  const [teachesOwnClass, setTeachesOwnClass] = useState(false);
  const [ownClassName, setOwnClassName] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherClassName, setTeacherClassName] = useState('');

  const addTeacher = () => {
    if (!teacherEmail.trim()) return;
    setTeachers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email: teacherEmail.trim(), className: teacherClassName.trim() || null },
    ]);
    setTeacherEmail('');
    setTeacherClassName('');
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

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
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
                disabled={!teachesOwnClass}
                placeholder="e.g. Squirrels"
                className="min-h-[48px] w-[260px] max-w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={!teachesOwnClass || !ownClassName.trim()}
                onClick={() => {
                  if (contactName) {
                    setTeachers((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), email: `${contactName} (you)`, className: ownClassName.trim() },
                    ]);
                  }
                  setOwnClassName('');
                  setTeachesOwnClass(false);
                }}
                className="inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg py-sm text-sm font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-lg flex flex-col items-center gap-xs rounded-md border border-line bg-surface p-2xl text-center">
            <h2 className="text-xl font-semibold text-ink-primary">Add Teachers</h2>
            <p className="text-sm text-ink-muted">Invite your teaching staff so they can set up their class and manage loans</p>
            <p className="text-sm text-ink-muted">{teachers.length === 0 ? 'No teachers added yet' : `${teachers.length} teacher${teachers.length === 1 ? '' : 's'} added`}</p>
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
                placeholder="e.g. jane.smith@riverbendprimary.co.uk"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <label className="flex min-w-[280px] flex-1 flex-col gap-xs">
              <span className="text-sm font-medium text-ink-primary">Class Name (optional)</span>
              <input
                value={teacherClassName}
                onChange={(e) => setTeacherClassName(e.target.value)}
                placeholder="e.g. Squirrels"
                className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              />
            </label>
            <button
              type="button"
              onClick={addTeacher}
              disabled={!teacherEmail.trim()}
              className="inline-flex min-h-[47px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Add Teacher
            </button>
          </div>

          {teachers.length > 0 && (
            <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="flex flex-col gap-xs rounded-md border border-line bg-surface p-lg">
                  <p className="font-semibold text-ink-primary">{teacher.email}</p>
                  {teacher.className && <p className="text-sm text-ink-muted">Class: {teacher.className}</p>}
                  <p className="text-sm font-medium text-amber-700">Awaiting Activation</p>
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

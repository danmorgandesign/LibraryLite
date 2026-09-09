import { useState } from 'react';
import AuthHeader from '../components/layout/AuthHeader';

type Student = { id: string; name: string };

const ONBOARDING_NAV = [
  { label: 'Books', to: '/books' },
  { label: 'Classes', to: '/classes' },
  { label: 'Account', to: '/profile' },
];

function WithClass() {
  const [students, setStudents] = useState<Student[]>([{ id: 'seed', name: 'Ava Thompson' }]);
  const [studentName, setStudentName] = useState('');

  const addStudent = () => {
    if (!studentName.trim()) return;
    setStudents((prev) => [...prev, { id: crypto.randomUUID(), name: studentName.trim() }]);
    setStudentName('');
  };

  return (
    <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-[28px] font-bold text-ink-primary">Welcome back, Mrs Jenkins</h1>
        <p className="mt-xs text-base text-ink-muted">You're teaching Squirrels. Add your students to get started.</p>

        <div className="mt-xl flex flex-col items-center gap-xs rounded-md border border-line bg-surface p-2xl text-center">
          <h2 className="text-xl font-semibold text-ink-primary">Squirrels</h2>
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

function WithoutClass() {
  const [claimSelection, setClaimSelection] = useState('Badgers');
  const [newClassName, setNewClassName] = useState('');

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
            <select
              value={claimSelection}
              onChange={(e) => setClaimSelection(e.target.value)}
              className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            >
              <option>Badgers</option>
            </select>
            <button
              type="button"
              className="mt-xs inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90"
            >
              Claim Class
            </button>
          </div>

          <div className="flex flex-col items-start gap-md rounded-md border border-line bg-surface p-2xl">
            <h2 className="text-xl font-semibold text-ink-primary">Create a New Class</h2>
            <p className="text-sm text-ink-muted">Set up a brand new class for your students.</p>
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Bumblebees"
              className="min-h-[48px] w-full rounded-md border border-line bg-surface-subtle px-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            <button
              type="button"
              disabled={!newClassName.trim()}
              className="mt-xs inline-flex min-h-[44px] items-center rounded-sm bg-accent px-lg text-base font-medium text-ink-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Create Class
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function TeacherOnboardingPage({ hasClass }: { hasClass: boolean }) {
  return (
    <>
      <AuthHeader navItems={ONBOARDING_NAV} />
      {hasClass ? <WithClass /> : <WithoutClass />}
    </>
  );
}

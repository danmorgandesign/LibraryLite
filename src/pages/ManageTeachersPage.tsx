import { useState } from 'react';
import Header from '../components/layout/Header';

type Teacher = {
  id: string;
  name: string;
  className: string;
  awaitingActivation: boolean;
};

// No `teachers` table in the schema yet — this roster is local-only, same
// as the teacher list added during admin onboarding.
const INITIAL_TEACHERS: Teacher[] = [
  { id: '1', name: 'Mrs Jenkins', className: 'Squirrels', awaitingActivation: false },
  { id: '2', name: 'Mr Reid', className: 'Badgers', awaitingActivation: true },
  { id: '3', name: 'Ms Patel', className: 'Otters', awaitingActivation: false },
  { id: '4', name: "Mr O'Connor", className: 'Hedgehogs', awaitingActivation: false },
  { id: '5', name: 'Mrs Khan', className: 'Kits', awaitingActivation: true },
];

type Modal = { type: 'add' } | { type: 'edit'; teacher: Teacher } | null;

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-lg">
      <div className="w-full max-w-sm rounded-md bg-surface p-xl shadow-lg">{children}</div>
    </div>
  );
}

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [modal, setModal] = useState<Modal>(null);
  const [nameInput, setNameInput] = useState('');
  const [classInput, setClassInput] = useState('');

  const closeModal = () => {
    setModal(null);
    setNameInput('');
    setClassInput('');
  };

  const handleAdd = () => {
    if (!nameInput.trim()) return;
    setTeachers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: nameInput.trim(), className: classInput.trim(), awaitingActivation: true },
    ]);
    closeModal();
  };

  const handleSaveEdit = () => {
    if (modal?.type !== 'edit' || !nameInput.trim()) return;
    setTeachers((prev) =>
      prev.map((t) => (t.id === modal.teacher.id ? { ...t, name: nameInput.trim(), className: classInput.trim() } : t)),
    );
    closeModal();
  };

  const handleRemove = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      <Header />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-ink-primary">Manage Teachers</h1>
          <p className="mt-xs text-sm text-ink-muted">Manage your school's teaching staff.</p>

          <div className="mt-xl flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Teachers</p>
            <button
              type="button"
              onClick={() => setModal({ type: 'add' })}
              className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
            >
              + Add Teacher
            </button>
          </div>

          <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex flex-col gap-xs rounded-md border border-line bg-surface p-lg shadow-sm">
                <p className="text-lg font-semibold text-ink-primary">{teacher.name}</p>
                {teacher.className && <p className="text-sm text-ink-muted">Class: {teacher.className}</p>}
                {teacher.awaitingActivation && <p className="text-sm font-medium text-amber-700">Awaiting Activation</p>}
                <div className="mt-sm flex flex-wrap gap-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(teacher.name);
                      setClassInput(teacher.className);
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

            {teachers.length === 0 && <p className="text-sm text-ink-muted">No teachers yet.</p>}
          </div>
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
            <input
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              placeholder="Class (optional)"
              className="mt-sm w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            <div className="mt-lg flex justify-end gap-sm">
              <button type="button" onClick={closeModal} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
                Cancel
              </button>
              <button type="submit" className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white">
                Add Teacher
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
            <input
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              placeholder="Class (optional)"
              className="mt-sm w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            <div className="mt-lg flex justify-end gap-sm">
              <button type="button" onClick={closeModal} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
                Cancel
              </button>
              <button type="submit" className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white">
                Save
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

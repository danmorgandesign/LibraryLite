import { useState } from 'react';
import Header from '../components/layout/Header';

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
  onBack: () => void;
};

// Placeholder roster — matches the Figma "Manage Class" card grid until this
// reads from a real `students` table (see BooksPage for the same pattern).
const INITIAL_STUDENTS = [
  'Ava M.', 'Noah T.', 'Isla P.', 'Leo R.', 'Mia K.', 'Oscar B.',
  'Freya L.', 'Jack W.', 'Amelia S.', 'Harry D.', 'Grace N.',
];

type Modal =
  | { type: 'add' }
  | { type: 'edit'; index: number }
  | { type: 'remove'; index: number }
  | { type: 'delete-class' }
  | null;

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-lg">
      <div className="w-full max-w-sm rounded-md bg-surface p-xl shadow-lg">{children}</div>
    </div>
  );
}

export default function ManageClassPage({ onScan, onBooksClick, onBack }: Props) {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [modal, setModal] = useState<Modal>(null);
  const [nameInput, setNameInput] = useState('');

  const closeModal = () => {
    setModal(null);
    setNameInput('');
  };

  const openAdd = () => {
    setNameInput('');
    setModal({ type: 'add' });
  };

  const openEdit = (index: number) => {
    setNameInput(students[index]);
    setModal({ type: 'edit', index });
  };

  const handleAdd = () => {
    if (nameInput.trim()) setStudents((prev) => [...prev, nameInput.trim()]);
    closeModal();
  };

  const handleSaveEdit = () => {
    if (modal?.type === 'edit' && nameInput.trim()) {
      setStudents((prev) => prev.map((s, i) => (i === modal.index ? nameInput.trim() : s)));
    }
    closeModal();
  };

  const handleRemove = () => {
    if (modal?.type === 'remove') {
      setStudents((prev) => prev.filter((_, i) => i !== modal.index));
    }
    closeModal();
  };

  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} />

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
              <p className="mt-xs text-sm text-ink-muted">Manage this class's student roster.</p>
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
              onClick={openAdd}
              className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
            >
              + Add Student
            </button>
          </div>

          <div className="mt-lg grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
            {students.map((name, index) => (
              <div key={index} className="flex flex-col gap-md rounded-md border border-line bg-surface p-lg shadow-sm">
                <p className="text-lg font-medium text-ink-primary">{name}</p>
                <div className="flex flex-wrap gap-sm">
                  <button
                    type="button"
                    onClick={() => openEdit(index)}
                    className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'remove', index })}
                    className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-rose-700 transition-opacity hover:opacity-80"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {students.length === 0 && <p className="text-sm text-ink-muted">No students in this class yet.</p>}
          </div>
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
            placeholder="Student name"
            className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
              Cancel
            </button>
            <button type="button" onClick={handleAdd} className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white">
              Add Student
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
            placeholder="Student name"
            className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
              Cancel
            </button>
            <button type="button" onClick={handleSaveEdit} className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white">
              Save
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'remove' && (
        <Modal>
          <h2 className="text-lg font-semibold text-ink-primary">Remove Student?</h2>
          <p className="mt-xs text-sm text-ink-muted">
            {students[modal.index]} will be removed from this class's roster.
          </p>
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
              Cancel
            </button>
            <button type="button" onClick={handleRemove} className="inline-flex min-h-[44px] items-center rounded-sm border border-rose-300 bg-surface px-md text-sm font-medium text-rose-700">
              Remove Student
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === 'delete-class' && (
        <Modal>
          <h2 className="text-lg font-semibold text-ink-primary">Delete Class?</h2>
          <p className="mt-xs text-sm text-ink-muted">This will permanently delete the class, its roster, and its loan history.</p>
          <div className="mt-lg flex justify-end gap-sm">
            <button type="button" onClick={closeModal} className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary">
              Cancel
            </button>
            <button type="button" onClick={onBack} className="inline-flex min-h-[44px] items-center rounded-sm border border-rose-300 bg-surface px-md text-sm font-medium text-rose-700">
              Delete Class
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient, getTenantSchoolId } from '../lib/supabaseClient';

type Classroom = { id: string; class_label: string };

type Props = {
  onScan: () => void;
  onBooksClick: () => void;
  onStudentsClick: () => void;
  onManageClass: (classroom: Classroom) => void;
  onViewLoans: (classroom: Classroom) => void;
};

async function fetchClassrooms(): Promise<Classroom[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('classrooms').select('id, class_label').order('class_label');
  if (error) throw error;
  return data;
}

async function addClassroom(classLabel: string): Promise<Classroom> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('classrooms')
    // academic_year is NOT NULL in the schema with no natural default yet —
    // there's no year-picker UI, so this hardcodes the current one for now.
    .insert({ school_id: getTenantSchoolId(), class_label: classLabel, academic_year: '2025-2026' })
    .select('id, class_label')
    .single();
  if (error) throw error;
  return data;
}

export default function ClassesPage({ onScan, onBooksClick, onStudentsClick, onManageClass, onViewLoans }: Props) {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchClassrooms()
      .then((data) => {
        if (!cancelled) setClassrooms(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load classes.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = classrooms === null && !error;

  const handleAddClass = async () => {
    if (!nameInput.trim()) return;
    setIsAdding(true);
    try {
      const classroom = await addClassroom(nameInput.trim());
      setClassrooms((prev) => [...(prev ?? []), classroom].sort((a, b) => a.class_label.localeCompare(b.class_label)));
      setIsAddModalOpen(false);
      setNameInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add class.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Header activeItem="classes" onScan={onScan} onBooksClick={onBooksClick} onStudentsClick={onStudentsClick} />

      <main className="min-h-screen px-lg pb-2xl pt-[104px] lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <div className="mb-lg flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-ink-primary">Classes</h1>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
            >
              + Add Class
            </button>
          </div>

          {isLoading && <p className="text-sm text-ink-muted">Loading classes…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {classrooms!.map((classroom) => (
                <div
                  key={classroom.id}
                  className="flex flex-col gap-md rounded-md border border-line bg-surface p-lg shadow-sm"
                >
                  <p className="text-xl font-semibold text-ink-primary">{classroom.class_label}</p>
                  <div className="flex flex-wrap gap-sm">
                    <button
                      type="button"
                      onClick={() => onManageClass(classroom)}
                      className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                    >
                      Manage Class
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewLoans(classroom)}
                      className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                    >
                      View Loans
                    </button>
                  </div>
                </div>
              ))}

              {classrooms!.length === 0 && <p className="text-sm text-ink-muted">No classes yet.</p>}
            </div>
          )}
        </div>
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-lg">
          <div className="w-full max-w-sm rounded-md bg-surface p-xl shadow-lg">
            <h2 className="text-lg font-semibold text-ink-primary">Add Class</h2>
            <p className="mt-xs text-sm text-ink-muted">Enter a name for the new class.</p>
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Class name"
              className="mt-md w-full rounded-sm border border-line bg-surface-subtle px-md py-sm text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
            <div className="mt-lg flex justify-end gap-sm">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNameInput('');
                }}
                disabled={isAdding}
                className="inline-flex min-h-[44px] items-center rounded-sm border border-line bg-surface px-md text-sm font-medium text-ink-primary disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddClass}
                disabled={isAdding}
                className="inline-flex min-h-[44px] items-center rounded-sm bg-ink-primary px-md text-sm font-medium text-white disabled:opacity-60"
              >
                {isAdding ? 'Adding…' : 'Add Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

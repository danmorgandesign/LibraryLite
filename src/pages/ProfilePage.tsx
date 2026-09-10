import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth';

type Classroom = { id: string; class_label: string };

async function fetchClassrooms(): Promise<Classroom[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('classrooms').select('id, class_label').order('class_label');
  if (error) throw error;
  return data;
}

type SelectOption = { value: string; label: string };

// Generic label/value row with an inline editor. What onSave actually does
// varies per field — see saveName/saveClassroom/requestEmailChange below —
// this component only handles the editing UI and the saving/error states
// around calling it.
function ProfileField({
  label,
  displayValue,
  editValue,
  onSave,
  options,
}: {
  label: string;
  // What's shown when not editing.
  displayValue: string;
  // What seeds the editor when Edit is clicked — for a select this is the
  // option's value (e.g. a classroom id), not its display label.
  editValue: string;
  onSave: (next: string) => void | Promise<void>;
  // When set, edit mode shows a dropdown constrained to these values instead
  // of a free-text input — for fields like Class where the value has to be
  // one of a known, finite set rather than whatever the teacher types.
  options?: SelectOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(editValue);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-between gap-md border-b border-line py-lg last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {isEditing ? (
          options ? (
            <div className="relative mt-xs w-1/2">
              {/* appearance-none drops the browser's own arrow (its inset
                  isn't controllable) so the custom chevron below can sit
                  exactly `xs` from the right — the same as the select's own
                  top/bottom padding, so its spacing reads as even on all
                  three sides instead of hugging the right edge. */}
              <select
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full appearance-none rounded-sm border border-line bg-surface-subtle py-xs pl-md pr-2xl text-base font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-xs top-1/2 size-3 -translate-y-1/2 text-ink-muted"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-xs w-full rounded-sm border border-line bg-surface-subtle px-md py-xs text-base font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
            />
          )
        ) : (
          <p className="mt-xs text-base font-semibold text-ink-primary">{displayValue}</p>
        )}
        {saveError && <p className="mt-xs text-sm text-red-600">{saveError}</p>}
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={async () => {
          if (!isEditing) {
            setDraft(editValue);
            setSaveError(null);
            setIsEditing(true);
            return;
          }
          setIsSaving(true);
          setSaveError(null);
          try {
            await onSave(draft);
            setIsEditing(false);
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Could not save — try again.');
          } finally {
            setIsSaving(false);
          }
        }}
        className="shrink-0 inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        {isSaving ? 'Saving…' : isEditing ? 'Save' : 'Edit'}
      </button>
    </div>
  );
}

const NO_CLASS_VALUE = '';

// Writes straight to the teachers row and refreshes the shared auth
// context, the same self-assign pattern TeacherOnboardingPage's "claim a
// class" step already uses (teachers can update their own row — RLS scopes
// updates to same-school rows, not "own row only" — so this isn't a new
// permission, just the same capability surfaced here too).
async function saveClassroom(teacherId: string, nextClassroomId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('teachers')
    .update({ classroom_id: nextClassroomId || null })
    .eq('id', teacherId);
  if (error) throw error;
}

async function saveName(teacherId: string, nextName: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('teachers')
    .update({ name: nextName.trim() || null })
    .eq('id', teacherId);
  if (error) throw error;
}

// Unlike Name/Class, Email is a Supabase Auth credential (teachers.email is
// only ever a pre-activation invite marker — this project has email
// confirmation on, per auth.tsx), not a plain data column. updateUser sends
// a confirmation link to the new address and doesn't take effect until it's
// clicked, so the signed-in session's email — and this field's displayed
// value — genuinely doesn't change yet. The caller shows a "check your
// inbox" notice instead of treating the field as saved.
async function requestEmailChange(nextEmail: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ email: nextEmail.trim() });
  if (error) throw error;
}

export default function ProfilePage() {
  // RequireAuth guarantees a signed-in user with a linked teachers row by
  // the time this page renders.
  const { user, teacher, refreshTeacher } = useAuth();

  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const ownClassLabel = classrooms?.find((c) => c.id === teacher?.classroom_id)?.class_label ?? 'Not teaching a class';
  const classOptions: SelectOption[] = [
    { value: NO_CLASS_VALUE, label: 'Not teaching a class' },
    ...(classrooms?.map((c) => ({ value: c.id, label: c.class_label })) ?? []),
  ];

  // pendingEmail tracks a just-submitted change that's awaiting the
  // confirmation link — user.email itself won't move until it's clicked.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  return (
    <>
      <Header />

      <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-ink-primary">My Profile</h1>
          <p className="mt-xs text-sm text-ink-muted">View and update your account details.</p>

          <div className="mt-lg grid grid-cols-1 gap-lg lg:grid-cols-[1fr_320px]">
            <div className="rounded-md border border-line bg-surface px-lg">
              <div className="flex items-center justify-between gap-md border-b border-line py-lg">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Profile Picture</p>
                  <div className="mt-xs flex size-16 items-center justify-center rounded-full bg-[#E5E9EC] text-[#849AAF]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-9">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                    </svg>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
                >
                  Edit
                </button>
              </div>

              <ProfileField
                label="Name"
                displayValue={teacher?.name ?? ''}
                editValue={teacher?.name ?? ''}
                onSave={async (nextName) => {
                  if (!teacher) return;
                  await saveName(teacher.id, nextName);
                  await refreshTeacher();
                }}
              />
              <ProfileField
                label="Class"
                displayValue={ownClassLabel}
                editValue={teacher?.classroom_id ?? NO_CLASS_VALUE}
                options={classOptions}
                onSave={async (nextClassroomId) => {
                  if (!teacher) return;
                  await saveClassroom(teacher.id, nextClassroomId);
                  await refreshTeacher();
                }}
              />
              <ProfileField
                label="Email"
                displayValue={user?.email ?? ''}
                editValue={user?.email ?? ''}
                onSave={async (nextEmail) => {
                  await requestEmailChange(nextEmail);
                  setPendingEmail(nextEmail);
                }}
              />
              {pendingEmail && (
                <p className="-mt-md pb-lg text-sm text-ink-muted">
                  Confirmation link sent to {pendingEmail} — your email won&rsquo;t change until you click it.
                </p>
              )}
            </div>

            <div className="rounded-md border border-line bg-surface p-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">School Classes</p>
              {error && <p className="mt-sm text-sm text-red-600">{error}</p>}
              {classrooms === null && !error && <p className="mt-sm text-sm text-ink-muted">Loading…</p>}
              {classrooms && (
                <div className="mt-sm flex flex-col">
                  {classrooms.map((classroom) => (
                    <div key={classroom.id} className="border-b border-line py-sm last:border-b-0">
                      <p className="font-semibold text-ink-primary">{classroom.class_label}</p>
                    </div>
                  ))}
                  {classrooms.length === 0 && <p className="py-sm text-sm text-ink-muted">No classes yet.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

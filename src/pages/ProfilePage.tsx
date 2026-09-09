import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { ensureTenantSession, getSupabaseClient } from '../lib/supabaseClient';

type Classroom = { id: string; class_label: string };

async function fetchClassrooms(): Promise<Classroom[]> {
  await ensureTenantSession();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('classrooms').select('id, class_label').order('class_label');
  if (error) throw error;
  return data;
}

// There's no real per-session user identity yet (see the note in
// supabaseClient.ts — this app is a shared anonymous kiosk), so the profile
// fields themselves are local placeholder state rather than a real account
// record.
function ProfileField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center justify-between gap-md border-b border-line py-lg last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-xs w-full rounded-sm border border-line bg-surface-subtle px-md py-xs text-base font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-ink-primary/20"
          />
        ) : (
          <p className="mt-xs text-base font-semibold text-ink-primary">{value}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (isEditing) {
            onChange(draft);
          } else {
            setDraft(value);
          }
          setIsEditing((v) => !v);
        }}
        className="shrink-0 inline-flex min-h-[44px] items-center rounded-sm border border-line bg-white px-md text-sm font-medium text-ink-primary transition-opacity hover:opacity-80"
      >
        {isEditing ? 'Save' : 'Edit'}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const [name, setName] = useState('Ms Patel');
  const [className, setClassName] = useState('Otters');
  const [email, setEmail] = useState('priya.patel@riverbendprimary.co.uk');

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

              <ProfileField label="Name" value={name} onChange={setName} />
              <ProfileField label="Class" value={className} onChange={setClassName} />
              <ProfileField label="Email" value={email} onChange={setEmail} />
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

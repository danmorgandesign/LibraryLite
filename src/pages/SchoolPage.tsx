import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth';

type Teacher = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'teacher';
  classroomLabel: string | null;
};

function mapTeacherRow(row: {
  id: string;
  name: string | null;
  email: string | null;
  role: 'admin' | 'teacher';
  classrooms: { class_label: string } | null;
}): Teacher {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    classroomLabel: row.classrooms?.class_label ?? null,
  };
}

async function fetchTeachers(): Promise<Teacher[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name, email, role, classrooms(class_label)')
    .order('name');
  if (error) throw error;
  // Supabase's untyped client infers the embedded to-one `classrooms`
  // relation as an array — see the same cast in ManageTeachersPage.tsx.
  return (data as unknown as Parameters<typeof mapTeacherRow>[0][]).map(mapTeacherRow);
}

type SchoolDetails = { name: string; address: string | null; postcode: string | null };

async function fetchSchoolDetails(schoolId: string): Promise<SchoolDetails> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('schools')
    .select('name, address, postcode')
    .eq('id', schoolId)
    .single();
  if (error) throw error;
  return data;
}

async function saveSchoolField(
  schoolId: string,
  field: keyof SchoolDetails,
  nextValue: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('schools')
    .update({ [field]: nextValue.trim() || null })
    .eq('id', schoolId);
  if (error) throw error;
}

// Row with a live edit affordance — only used for fields the schema
// actually persists (name/address/postcode). Mirrors ProfilePage.tsx's
// ProfileField pattern.
function EditableDetailRow({
  label,
  displayValue,
  onSave,
}: {
  label: string;
  displayValue: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
          <p className="mt-xs text-base font-semibold text-ink-primary">{displayValue}</p>
        )}
        {saveError && <p className="mt-xs text-sm text-red-600">{saveError}</p>}
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={async () => {
          if (!isEditing) {
            setDraft(displayValue);
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

// Static row for fields the schema doesn't persist yet (subscription/
// billing) — no Edit button, since there's nowhere for an edit to be
// saved. Values are placeholder copy matching the Figma reference (node
// 643:2, APP-07 My School), not live data.
function StaticDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line py-lg last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-xs text-base font-semibold text-ink-primary">{value}</p>
    </div>
  );
}

export default function SchoolPage() {
  const { teacher } = useAuth();
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacher) return;
    let cancelled = false;
    fetchSchoolDetails(teacher.school_id)
      .then((details) => {
        if (!cancelled) setSchool(details);
      })
      .catch((err) => {
        if (!cancelled) setDetailsError(err instanceof Error ? err.message : 'Could not load school details.');
      });
    return () => {
      cancelled = true;
    };
  }, [teacher]);

  useEffect(() => {
    let cancelled = false;
    fetchTeachers()
      .then((data) => {
        if (!cancelled) setTeachers(data);
      })
      .catch((err) => {
        if (!cancelled) setTeachersError(err instanceof Error ? err.message : 'Could not load teachers.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const admin = teachers?.find((t) => t.role === 'admin') ?? null;

  return (
    <>
      <Header />

      <main className="min-h-screen px-lg pb-2xl pt-2xl lg:px-2xl">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold text-ink-primary">My School</h1>
          <p className="mt-xs text-sm text-ink-muted">View and update your account details.</p>

          <div className="mt-lg grid grid-cols-1 gap-lg lg:grid-cols-[1fr_320px]">
            <div className="rounded-md border border-line bg-surface px-lg">
              {school && teacher ? (
                <>
                  <EditableDetailRow
                    label="School Name"
                    displayValue={school.name}
                    onSave={async (next) => {
                      await saveSchoolField(teacher.school_id, 'name', next);
                      setSchool({ ...school, name: next.trim() });
                    }}
                  />
                  <EditableDetailRow
                    label="Address"
                    displayValue={school.address ?? ''}
                    onSave={async (next) => {
                      await saveSchoolField(teacher.school_id, 'address', next);
                      setSchool({ ...school, address: next.trim() || null });
                    }}
                  />
                  <EditableDetailRow
                    label="Postcode"
                    displayValue={school.postcode ?? ''}
                    onSave={async (next) => {
                      await saveSchoolField(teacher.school_id, 'postcode', next);
                      setSchool({ ...school, postcode: next.trim() || null });
                    }}
                  />
                </>
              ) : (
                <div className="border-b border-line py-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">School Name</p>
                  <p className="mt-xs text-base font-semibold text-ink-primary">{detailsError ?? 'Loading…'}</p>
                </div>
              )}
              <div className="border-b border-line py-lg last:border-b-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Admin</p>
                <p className="mt-xs text-base font-semibold text-ink-primary">
                  {teachersError
                    ? teachersError
                    : (admin?.email ?? admin?.name ?? (teachers === null ? 'Loading…' : 'No admin on this school yet.'))}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-line bg-surface p-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Teachers</p>
              {teachersError && <p className="mt-sm text-sm text-red-600">{teachersError}</p>}
              {teachers === null && !teachersError && <p className="mt-sm text-sm text-ink-muted">Loading…</p>}
              {teachers && (
                <div className="mt-sm flex flex-col">
                  {teachers.map((t) => (
                    <div key={t.id} className="border-b border-line py-sm last:border-b-0">
                      <p className="font-semibold text-ink-primary">{t.name ?? t.email ?? 'Unnamed teacher'}</p>
                      {t.classroomLabel && <p className="text-sm text-ink-muted">{t.classroomLabel}</p>}
                    </div>
                  ))}
                  {teachers.length === 0 && <p className="py-sm text-sm text-ink-muted">No teachers yet.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-lg rounded-md border border-line bg-surface px-lg">
            <p className="pt-lg text-xs font-semibold uppercase tracking-wide text-ink-muted">Subscription</p>
            <StaticDetailRow label="Plan" value="School Plan – Annual" />
            <StaticDetailRow label="Price" value="£15/month, billed annually" />
            <StaticDetailRow label="Renews" value="8 September 2027" />
          </div>
        </div>
      </main>
    </>
  );
}

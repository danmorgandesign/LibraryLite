import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export type Teacher = {
  id: string;
  school_id: string;
  role: 'admin' | 'teacher';
  classroom_id: string | null;
  name: string | null;
  email: string | null;
  activated_at: string | null;
};

type AuthContextValue = {
  user: User | null;
  teacher: Teacher | null;
  loading: boolean;
  refreshTeacher: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// This Supabase project has email confirmation ON (verified directly — a
// fresh signUp() returns a user but no session until the email link is
// clicked), so a brand-new admin's `register_school_and_admin` call can't
// happen in the same request as signUp() the way it could if confirmation
// were off. RegisterYourselfPage stashes the school/admin name here right
// before showing its "check your email" message; once the admin confirms
// and logs in (possibly a browser restart later, same device), this module
// finishes the registration automatically instead of asking them to
// re-enter it. Known limitation, not solved here: confirming on a
// different device than the one that signed up loses this handoff, since
// it's localStorage rather than server-side state — acceptable for a
// small pilot, worth revisiting if that becomes a real complaint.
const PENDING_SCHOOL_KEY = 'library-lite:pending-school-registration';

type PendingSchoolRegistration = { schoolName: string; adminName: string };

export function stashPendingSchoolRegistration(data: PendingSchoolRegistration) {
  localStorage.setItem(PENDING_SCHOOL_KEY, JSON.stringify(data));
}

function takePendingSchoolRegistration(): PendingSchoolRegistration | null {
  const raw = localStorage.getItem(PENDING_SCHOOL_KEY);
  if (!raw) return null;
  localStorage.removeItem(PENDING_SCHOOL_KEY);
  try {
    return JSON.parse(raw) as PendingSchoolRegistration;
  } catch {
    return null;
  }
}

async function fetchOwnTeacherRow(userId: string): Promise<Teacher | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('teachers')
    .select('id, school_id, role, classroom_id, name, email, activated_at')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeacherFor = async (userId: string) => {
    let row = await fetchOwnTeacherRow(userId);

    // No teachers row yet — this is either a brand-new admin who just
    // confirmed their email (finish the registration this module stashed
    // earlier) or an invited teacher who hasn't claimed their invite yet
    // (left null here; TeacherOnboardingPage handles that case).
    if (!row) {
      const pending = takePendingSchoolRegistration();
      if (pending) {
        const supabase = getSupabaseClient();
        const { error } = await supabase.rpc('register_school_and_admin', {
          school_name: pending.schoolName,
          admin_name: pending.adminName,
        });
        if (error) throw error;
        row = await fetchOwnTeacherRow(userId);
      }
    }

    setTeacher(row);
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (cancelled) return;
      setSession(initial);
      if (initial?.user) await loadTeacherFor(initial.user.id);
      if (!cancelled) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (cancelled) return;
      setSession(next);
      if (next?.user) {
        await loadTeacherFor(next.user.id);
      } else {
        setTeacher(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTeacher = async () => {
    if (session?.user) await loadTeacherFor(session.user.id);
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, teacher, loading, refreshTeacher }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Guards every "inside the app" route: redirects to /login when signed
// out, and to /teacher-onboarding when signed in but not yet linked to a
// school (a brand-new admin mid-email-confirmation, or an invited teacher
// who hasn't claimed their invite / been assigned a class yet) — so every
// other page can assume a complete, usable session by the time it renders.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, teacher, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const onboardingIncomplete = !teacher || (teacher.role === 'teacher' && !teacher.classroom_id);
  if (onboardingIncomplete && location.pathname !== '/teacher-onboarding') {
    return <Navigate to="/teacher-onboarding" replace />;
  }

  return <>{children}</>;
}

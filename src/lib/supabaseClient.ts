import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let tenantSessionReady: Promise<void> | null = null;

// This app has no login UI — it's a shared kiosk tablet, not per-user
// accounts — so there's no natural place to sign in. The multi-tenant RLS
// policies still require a JWT with a school_id claim, so every session is
// signed in anonymously and tagged with this one fixed tenant. See the
// SECURITY NOTE in supabase/migrations/20260710104839_multi_tenant_schema.sql:
// user_metadata is client-editable, which is fine for a single known tenant
// but must move to app_metadata (server-set only) before this app ever has
// more than one school.
const DEMO_SCHOOL_ID = 'effdf624-c3c2-437b-b634-703fcff9def5';

// Lazy on purpose: a missing/misconfigured env var should only break the
// features that actually touch Supabase, not crash the whole app at
// startup (a top-level throw here would blank every page, including ones
// that never call this).
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.');
  }

  cachedClient = createClient(supabaseUrl, supabasePublishableKey);
  return cachedClient;
}

// Ensures the current session is signed in (anonymously) and tagged with the
// demo school's id, so RLS's tenant-isolation checks pass. Safe to call
// before every Supabase query that needs to read/write tenant data —
// resolves immediately once the first call has completed.
export function ensureTenantSession(): Promise<void> {
  if (tenantSessionReady) return tenantSessionReady;

  const supabase = getSupabaseClient();

  tenantSessionReady = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.school_id !== DEMO_SCHOOL_ID) {
      const { error: updateError } = await supabase.auth.updateUser({ data: { school_id: DEMO_SCHOOL_ID } });
      if (updateError) throw updateError;

      // updateUser() changes the stored user record, but the current
      // session's JWT was already issued (at sign-in) without this claim —
      // RLS reads school_id straight out of the JWT, so without a refresh
      // here every query keeps failing as if school_id were still unset.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
    }
  })();

  return tenantSessionReady;
}

// The current tenant's school_id, for inserts that need to set it explicitly
// (RLS only checks that a row's school_id matches the JWT claim — it doesn't
// fill the column in for you). Only meaningful after ensureTenantSession()
// has resolved.
export function getTenantSchoolId(): string {
  return DEMO_SCHOOL_ID;
}

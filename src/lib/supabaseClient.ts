import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

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

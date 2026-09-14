// Sends a real Supabase Auth invite email to a newly-added teacher.
//
// ManageTeachersPage's "Add Teacher" flow only ever wrote a `teachers` row
// (name/email/classroom_id, auth_user_id left null) — the teacher had to
// separately discover the app and self-serve sign up at /teacher-onboarding
// with the exact same email, which claim_teacher_invite() then matches to
// this row. That still works as a fallback, but nothing actually told the
// teacher to do it. This function closes that gap: it creates the Supabase
// Auth user right away and sends Supabase's built-in invite email, whose
// link signs the teacher in directly. From there the existing
// claim_teacher_invite() flow (unchanged) links this auth user to their
// pre-created row by matching verified email.
//
// admin.inviteUserByEmail() needs the service role key, which never ships
// to the browser — same reasoning as analyze-cover keeping its billed
// Vision API key server-side. Unlike that function's GOOGLE_VISION_API_KEY,
// no `supabase secrets set` is needed here: SUPABASE_URL, SUPABASE_ANON_KEY
// and SUPABASE_SERVICE_ROLE_KEY are injected into every Edge Function
// automatically.
//
// Setup required before this works (not done by this code):
//   1. `supabase link` (already done for this project).
//   2. `supabase functions deploy invite-teacher`.
//   3. In the Supabase dashboard, Authentication > URL Configuration, make
//      sure the deployed app's origin is in "Redirect URLs" — otherwise
//      admin.inviteUserByEmail()'s redirectTo is rejected and the invite
//      link falls back to the Site URL default.
//
// An invited teacher has no password yet (inviteUserByEmail never asks for
// one) — the client is expected to prompt them to set one right after the
// invite link signs them in, the same way Supabase's own docs recommend.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their own JWT, RLS still applies on this
    // client — mirrors auth.tsx's fetchOwnTeacherRow lookup exactly.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerUserError,
    } = await callerClient.auth.getUser();
    if (callerUserError || !caller) return jsonResponse({ error: 'Not signed in.' }, 401);

    const { data: callerTeacher, error: callerTeacherError } = await callerClient
      .from('teachers')
      .select('role')
      .eq('auth_user_id', caller.id)
      .maybeSingle();
    if (callerTeacherError) return jsonResponse({ error: callerTeacherError.message }, 500);
    if (!callerTeacher || callerTeacher.role !== 'admin') {
      return jsonResponse({ error: 'Only a school admin can invite teachers.' }, 403);
    }

    const { email, redirectTo } = await req.json();
    if (typeof email !== 'string' || !email.trim()) {
      return jsonResponse({ error: 'email is required.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: typeof redirectTo === 'string' && redirectTo ? redirectTo : undefined,
    });
    if (inviteError) return jsonResponse({ error: inviteError.message }, 502);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

-- Adds real per-teacher identity: auth_user_id links a teachers row to a
-- Supabase Auth user, role distinguishes admin vs teacher permissions.
alter table teachers add column auth_user_id uuid references auth.users(id) on delete cascade;
alter table teachers add column role text not null default 'teacher' check (role in ('admin', 'teacher'));

create unique index teachers_auth_user_id_key on teachers(auth_user_id) where auth_user_id is not null;

-- Replaces the client-editable user_metadata lookup (see the old SECURITY
-- NOTE in 20260710104839_multi_tenant_schema.sql) with a real tenant
-- lookup: each signed-in user's school_id is whatever their own teachers
-- row says, keyed off auth.uid() — a value the client cannot forge (it's
-- the verified `sub` claim off the JWT, not an editable claim).
--
-- SECURITY DEFINER is required, not optional: teachers itself has an RLS
-- policy of `using (school_id = get_user_school_id())`. Without SECURITY
-- DEFINER, the `select ... from teachers` inside this function would be
-- subject to that same policy, which calls this same function again to
-- evaluate -> infinite recursion. LANGUAGE SQL inlining does not avoid
-- this; RLS is applied at query-rewrite time regardless of inlining.
--
-- SECURITY DEFINER fixes it because the function then executes as its
-- owner (`postgres`, since Supabase migrations run as postgres) rather
-- than as the calling `authenticated` role -- and postgres also owns the
-- teachers table. Table owners are exempt from their own table's RLS
-- policies by default (FORCE ROW LEVEL SECURITY is not set here), so the
-- inner lookup runs with no policy check at all, breaking the recursion.
--
-- `set search_path = public` pins name resolution so this definer-
-- privileged function can't be tricked by a role-local search_path into
-- resolving `teachers` to some other schema's table.
create or replace function get_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from teachers where auth_user_id = auth.uid() limit 1;
$$;

grant execute on function get_user_school_id() to authenticated;

-- SECURITY HARDENING (new, beyond the JWT-vs-metadata fix): with role and
-- auth_user_id now real columns, the existing blanket
-- "school_id = get_user_school_id()" USING/WITH CHECK policy on teachers
-- would let ANY signed-in teacher in the tenant directly UPDATE or INSERT
-- these two columns via a normal supabase-js call -- e.g. self-promote to
-- role='admin', or hijack a pending invite by setting its auth_user_id to
-- their own uid, completely bypassing the claim_teacher_invite() RPC's
-- email-matching guard. Column-level REVOKE closes this: the RLS policy
-- still governs row visibility as before, but only the two SECURITY
-- DEFINER RPCs (which run as the table owner and are exempt from
-- role-level grants) can ever write auth_user_id/role. Existing UI
-- (ManageTeachersPage's addTeacher/updateTeacher) never touches these two
-- columns, so this is a no-op for current behavior.
revoke insert (auth_user_id, role), update (auth_user_id, role) on teachers from authenticated;

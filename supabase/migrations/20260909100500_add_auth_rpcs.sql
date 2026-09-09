-- Creates a school + the caller's own admin teachers row, atomically.
-- SECURITY DEFINER is required to bootstrap: before this runs, the caller
-- has no teachers row, so get_user_school_id() is null and a normal insert
-- into schools would fail its own RLS check. Scoped entirely to auth.uid()
-- (never a parameter), so a caller can only ever create/link their own row.
create or replace function register_school_and_admin(school_name text, admin_name text)
returns table (school_id uuid, teacher_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_school_id uuid;
  v_teacher_id uuid;
begin
  if v_uid is null then
    raise exception 'Must be signed in to register a school.';
  end if;

  if exists (select 1 from teachers where auth_user_id = v_uid) then
    raise exception 'This account is already linked to a school.';
  end if;

  insert into schools (name) values (trim(school_name))
  returning id into v_school_id;

  insert into teachers (school_id, auth_user_id, name, role, activated_at)
  values (v_school_id, v_uid, nullif(trim(admin_name), ''), 'admin', now())
  returning id into v_teacher_id;

  return query select v_school_id, v_teacher_id;
end;
$$;

grant execute on function register_school_and_admin(text, text) to authenticated;

-- Claims a pending admin-created invite row for the signed-in user by
-- matching email -- see the "next logical step" auth plan for the React-
-- side flow. Deliberately takes NO email parameter: the match uses
-- auth.jwt()->>'email' (the verified email claim off the caller's own
-- session), the same style of claim lookup this schema's original
-- get_user_school_id() used, so a caller can never claim another email's
-- pending invite by passing a different email string.
create or replace function claim_teacher_invite()
returns table (teacher_id uuid, school_id uuid, classroom_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_teacher_id uuid;
  v_school_id uuid;
  v_classroom_id uuid;
begin
  if v_uid is null then
    raise exception 'Must be signed in to claim an invite.';
  end if;

  if exists (select 1 from teachers where auth_user_id = v_uid) then
    raise exception 'This account is already linked to a school.';
  end if;

  if v_email is null then
    raise exception 'No email on this account.';
  end if;

  select id, school_id, classroom_id into v_teacher_id, v_school_id, v_classroom_id
  from teachers
  where auth_user_id is null
    and lower(email) = lower(v_email)
  order by created_at
  limit 1;

  if v_teacher_id is null then
    raise exception 'No pending invite found for %.', v_email;
  end if;

  update teachers
  set auth_user_id = v_uid, activated_at = now()
  where id = v_teacher_id;

  return query select v_teacher_id, v_school_id, v_classroom_id;
end;
$$;

grant execute on function claim_teacher_invite() to authenticated;

-- claim_teacher_invite()'s RETURNS TABLE clause implicitly declares
-- school_id/classroom_id as usable bare identifiers within the function
-- body (the same way OUT parameters work in PL/pgSQL) — which collided
-- with the teachers table's own same-named columns in the unqualified
-- `select id, school_id, classroom_id from teachers ...` below, throwing
-- "column reference is ambiguous". Fixed by qualifying every selected
-- column with the table alias.
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

  select t.id, t.school_id, t.classroom_id into v_teacher_id, v_school_id, v_classroom_id
  from teachers t
  where t.auth_user_id is null
    and lower(t.email) = lower(v_email)
  order by t.created_at
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

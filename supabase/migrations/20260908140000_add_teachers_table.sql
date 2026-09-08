-- Teachers, tenant-isolated the same way as every other table here.
--
-- Deliberately no auth_user_id or role column yet -- that needs real
-- multi-tenant signup/login first (see the SECURITY NOTE on
-- get_user_school_id() in the initial schema migration), which is a
-- separate, larger piece of work. This table just backs the Manage
-- Teachers CRUD screen for now, the same way students/classrooms did
-- before any of that existed either.

create table teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  classroom_id uuid references classrooms(id) on delete set null,
  name text not null,
  -- null = awaiting activation, matches the retired_at/returned_at
  -- convention already used elsewhere in this schema (a nullable
  -- timestamp as the status, rather than a separate boolean column).
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create index teachers_school_id_idx on teachers(school_id);
create index teachers_classroom_id_idx on teachers(classroom_id);

alter table teachers enable row level security;

create policy "Tenant isolation: teachers" on teachers
  for all
  using (school_id = get_user_school_id())
  with check (school_id = get_user_school_id());

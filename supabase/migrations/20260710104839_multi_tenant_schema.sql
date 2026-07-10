-- Library Lite: multi-tenant schema (schools, classrooms, students, books, loans)
-- with tenant-isolated Row Level Security.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- provides gen_random_uuid()

-- Replaces the "schools" table that had been created by hand directly in the
-- Supabase dashboard before this migration existed (empty, untracked) — drop
-- it so the create below is the single source of truth going forward.
drop table if exists schools cascade;

-- =========================================
-- SCHOOLS
-- =========================================
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- =========================================
-- CLASSROOMS
-- =========================================
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  class_label text not null,
  academic_year text not null,
  created_at timestamptz not null default now()
);

create index classrooms_school_id_idx on classrooms(school_id);

-- =========================================
-- STUDENTS
-- =========================================
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  classroom_id uuid references classrooms(id) on delete set null,
  first_name text not null,
  last_initial varchar(1) not null,
  shortcode text unique,
  created_at timestamptz not null default now()
);

create index students_school_id_idx on students(school_id);
create index students_classroom_id_idx on students(classroom_id);

-- Auto-assigns a unique shortcode on insert when one isn't supplied.
-- Format: up to 3 letters of first_name + last_initial, then a zero-padded
-- disambiguator that increments until a free shortcode is found
-- (e.g. "AVAM00", "AVAM01", ...).
create or replace function generate_student_shortcode()
returns trigger
language plpgsql
as $$
declare
  base_code text;
  candidate text;
  suffix int := 0;
begin
  if new.shortcode is not null and length(trim(new.shortcode)) > 0 then
    return new;
  end if;

  base_code := upper(left(regexp_replace(new.first_name, '[^a-zA-Z]', '', 'g'), 3) || coalesce(new.last_initial, ''));
  if base_code = '' then
    base_code := 'STU';
  end if;

  loop
    candidate := base_code || lpad(suffix::text, 2, '0');
    exit when not exists (select 1 from students where shortcode = candidate);
    suffix := suffix + 1;
  end loop;

  new.shortcode := candidate;
  return new;
end;
$$;

create trigger trg_students_shortcode
  before insert on students
  for each row
  execute function generate_student_shortcode();

-- =========================================
-- BOOKS
-- =========================================
create table books (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  barcode text not null unique,
  title text not null,
  author text,
  cover_url text,
  created_at timestamptz not null default now()
);

-- B-Tree index for fast camera-scan barcode lookups.
create index books_barcode_idx on books using btree (barcode);
create index books_school_id_idx on books(school_id);

-- =========================================
-- LOANS
-- =========================================
create table loans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  loaned_at timestamptz not null default now(),
  returned_at timestamptz
);

create index loans_school_id_idx on loans(school_id);
create index loans_book_id_idx on loans(book_id);
create index loans_student_id_idx on loans(student_id);
-- Partial index for the most common query in this domain: currently outstanding loans.
create index loans_outstanding_idx on loans(book_id) where returned_at is null;

-- =========================================
-- ROW LEVEL SECURITY / TENANT ISOLATION
-- =========================================

-- SECURITY NOTE: this reads school_id from `user_metadata`, per spec. `user_metadata`
-- is editable by the signed-in user themselves (via supabase.auth.updateUser()), so a
-- malicious or compromised client could rewrite their own school_id and read/write
-- another tenant's rows. Before going to production, prefer `app_metadata` instead
-- (`auth.jwt() -> 'app_metadata' ->> 'school_id'`), which can only be set server-side
-- (e.g. a service-role Edge Function at signup) — not by the user's own client. Swap
-- the lookup below when you tighten this up.
create or replace function get_user_school_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'school_id', '')::uuid;
$$;

alter table schools enable row level security;
alter table classrooms enable row level security;
alter table students enable row level security;
alter table books enable row level security;
alter table loans enable row level security;

create policy "Tenant isolation: schools" on schools
  for all
  using (id = get_user_school_id())
  with check (id = get_user_school_id());

create policy "Tenant isolation: classrooms" on classrooms
  for all
  using (school_id = get_user_school_id())
  with check (school_id = get_user_school_id());

create policy "Tenant isolation: students" on students
  for all
  using (school_id = get_user_school_id())
  with check (school_id = get_user_school_id());

create policy "Tenant isolation: books" on books
  for all
  using (school_id = get_user_school_id())
  with check (school_id = get_user_school_id());

create policy "Tenant isolation: loans" on loans
  for all
  using (school_id = get_user_school_id())
  with check (school_id = get_user_school_id());

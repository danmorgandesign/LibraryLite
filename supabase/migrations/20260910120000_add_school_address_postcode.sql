-- Backs the My School page's Address/Postcode fields (previously static
-- placeholder text — see SchoolPage.tsx). Nullable/free-text, same as every
-- other optional contact-style field in this schema (e.g. teachers.email) —
-- no format validation, just storage. No RLS change needed: the existing
-- "Tenant isolation: schools" policy (`for all using/with check (id =
-- get_user_school_id())`) already covers UPDATE on these new columns the
-- same way it already covers `name`.
alter table schools
  add column address text,
  add column postcode text;

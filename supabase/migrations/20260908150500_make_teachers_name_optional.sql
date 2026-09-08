-- A teacher invited by email during admin onboarding has no name yet --
-- they set it when they activate. `name not null` (from the initial
-- teachers migration) assumed the "add a colleague you already know by
-- name" path only; email-only invite rows need this relaxed.
alter table teachers alter column name drop not null;

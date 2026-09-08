-- Admin onboarding invites a teacher by email before their name is known
-- (they set it when they activate) -- Manage Teachers' "add a colleague"
-- flow goes the other way (name known, no email collected yet). Both write
-- to the same table, so both columns are nullable: a row may have a name,
-- an email, or eventually both once a teacher has actually activated.
alter table teachers add column email text;

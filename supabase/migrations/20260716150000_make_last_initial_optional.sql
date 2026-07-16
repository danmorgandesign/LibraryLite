-- Children's names should be first-name-only by default, with a last
-- initial added only when needed to disambiguate (e.g. two "Ava"s in one
-- class) — the column was declared NOT NULL even though the shortcode
-- trigger already defends against a null value via coalesce().
alter table students alter column last_initial drop not null;

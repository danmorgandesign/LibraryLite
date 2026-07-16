-- "Retire Book" (Book Detail screen) archives a book rather than deleting
-- it outright — retired books drop out of the active catalogue view but
-- the row (and its loan history) is kept.
alter table books add column retired_at timestamptz;

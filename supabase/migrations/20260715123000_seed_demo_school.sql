-- Seeds the single tenant this app currently has a client for. The app has
-- no login UI (shared kiosk tablet, not per-user accounts), so it signs in
-- anonymously and tags that session with this fixed school_id (see
-- src/lib/supabaseClient.ts) rather than looking the school up — RLS's
-- tenant-isolation policy on `schools` itself requires already knowing the
-- id, so there's no way to discover it via a query first.
insert into schools (id, name)
values ('effdf624-c3c2-437b-b634-703fcff9def5', 'Demo School')
on conflict (id) do nothing;

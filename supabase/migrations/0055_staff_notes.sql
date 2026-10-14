-- Beach Kids ERO Self-Audit Portal
-- Migration 0055: Staff Notes — dated management notes against a staff
-- profile, each one showing who added it. Separate from staff.notes (the
-- older free-text "other information" field, left as-is for anything that
-- isn't a dated note) so there's a real append-only, authored log rather
-- than one block of text anyone can overwrite.
--
-- This is also one of the fields the brief asks to be restricted to
-- authorised management — see the app-level access check in
-- src/lib/data/profiles.ts (isAuthorisedManagement). RLS here still uses
-- the same single-shared-login "any authenticated user" policy as the rest
-- of the app, because there is currently only one login for Beach Kids —
-- the real restriction happens in the app's own server-side code, not at
-- the database level. See the accompanying report for why.
--
-- Run this AFTER 0054_staff_availability.sql.

create table if not exists staff_notes (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_staff_notes_staff on staff_notes(staff_id);

alter table staff_notes enable row level security;

drop policy if exists "staff_notes_all_authenticated" on staff_notes;
create policy "staff_notes_all_authenticated" on staff_notes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

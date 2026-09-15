-- Beach Kids ERO Self-Audit Portal
-- Migration 0031: Accident & Illness Records — the first of the eight
-- "coming soon" Records & Compliance modules to be built for real, using
-- the exact fields on Beach Kids' real paper "Accident & Illness Form"
-- (for moderate-to-serious injuries requiring parent contact), which Ethan
-- supplied as a photo of the blank template:
--   Date | Time | Child Full Name | Time Parent Contacted |
--   Description of incident/accident | Equipment Involved (Y/N) |
--   Another Child Involved (Y/N) | First Aid Provided |
--   Further first aid required (Y/N) | First Aid Supplies Used |
--   Staff Signature | Parent Signature
--
-- Design notes:
--   - "Child Full Name" links to the existing children table (child_id) —
--     it is always a real, already-existing child, never free text and
--     never a new/duplicate child record.
--   - "Staff Signature" links to the existing staff table (staff_id) — the
--     staff member who completed and signed the form. This is a record of
--     who filled it in, not a captured digital signature.
--   - "Parent Signature" is stored as a plain boolean (parent_signed) — an
--     acknowledgement checkbox, not a captured signature. The actual signed
--     paper form is the legal record and gets attached as evidence (below).
--   - The three Yes/No fields on the paper form (equipment_involved,
--     another_child_involved, further_first_aid_required) are nullable
--     booleans rather than defaulting to false, so "not yet recorded" stays
--     honestly distinct from "No".
--   - evidence_id reuses the existing evidence table/bucket exactly like
--     emergency_drills.evidence_id does — the uploaded photo of the signed
--     paper form is filed there, not in a new bucket.
--
-- Run this in the Supabase SQL editor after 0001-0030, in order. Safe to
-- run more than once.

create table if not exists accident_illness_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  incident_date date not null,
  incident_time time,
  time_parent_contacted time,
  description text,
  equipment_involved boolean,
  another_child_involved boolean,
  first_aid_provided text,
  further_first_aid_required boolean,
  first_aid_supplies_used text,
  staff_id uuid references staff(id) on delete set null,
  parent_signed boolean not null default false,
  evidence_id uuid references evidence(id) on delete set null,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_accident_illness_records_date on accident_illness_records(incident_date desc);
create index if not exists idx_accident_illness_records_child on accident_illness_records(child_id);

alter table accident_illness_records enable row level security;

drop policy if exists "accident_illness_records_all_authenticated" on accident_illness_records;
create policy "accident_illness_records_all_authenticated" on accident_illness_records
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists trg_accident_illness_records_updated on accident_illness_records;
create trigger trg_accident_illness_records_updated before update on accident_illness_records
  for each row execute procedure set_updated_at();

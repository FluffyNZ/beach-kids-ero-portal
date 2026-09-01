-- Beach Kids ERO Self-Audit Portal
-- Migration 0006: Staff extras — completion date on documents, a
-- Professional Growth Cycle document category, and the per-staff
-- Children's Worker Safety Check / Contracts & HR File checklist.
--
-- Run this in the Supabase SQL editor after 0001-0005, in order.
--
-- IMPORTANT: this migration creates checklist TEMPLATE rows only (the
-- questions themselves, shared by every staff member) — it does not check
-- off any item for anyone. Do not mark any staff checklist item complete
-- without real evidence for that specific person.

-- ---------------------------------------------------------------------------
-- staff_documents — add a "date this was done" field, distinct from
-- expiry_date ("date this is next due"). Lets you record e.g. when a
-- police vet was completed as well as when it needs renewing.
-- ---------------------------------------------------------------------------

alter table staff_documents add column if not exists document_date date;

-- Professional Growth Cycle records are just another document category —
-- upload the cycle's evidence with document_date = completed, and
-- expiry_date = next cycle due, so it gets the same renewal-style alert as
-- a police vet or first aid certificate.
alter type staff_document_category add value if not exists 'professional_growth_cycle';

-- ---------------------------------------------------------------------------
-- staff_checklist_areas / staff_checklist_items — the TEMPLATE. Two areas,
-- with the exact checklist items Beach Kids uses. Shared by every staff
-- member; per-person completion lives in staff_checklist_status below.
-- ---------------------------------------------------------------------------

create table if not exists staff_checklist_areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists staff_checklist_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references staff_checklist_areas(id) on delete cascade,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (area_id, description)
);

create index if not exists idx_staff_checklist_items_area on staff_checklist_items(area_id);

-- ---------------------------------------------------------------------------
-- staff_checklist_status — one row per (staff member, checklist item) once
-- it has been looked at. Absence of a row = not yet checked.
-- ---------------------------------------------------------------------------

create table if not exists staff_checklist_status (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  item_id uuid not null references staff_checklist_items(id) on delete cascade,
  is_checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references profiles(id),
  notes text,
  unique (staff_id, item_id)
);

create index if not exists idx_staff_checklist_status_staff on staff_checklist_status(staff_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — same "any authenticated user may read/write" shape
-- as the rest of this single-organisation app.
-- ---------------------------------------------------------------------------

alter table staff_checklist_areas enable row level security;
alter table staff_checklist_items enable row level security;
alter table staff_checklist_status enable row level security;

drop policy if exists "staff_checklist_areas_all_authenticated" on staff_checklist_areas;
create policy "staff_checklist_areas_all_authenticated" on staff_checklist_areas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff_checklist_items_all_authenticated" on staff_checklist_items;
create policy "staff_checklist_items_all_authenticated" on staff_checklist_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff_checklist_status_all_authenticated" on staff_checklist_status;
create policy "staff_checklist_status_all_authenticated" on staff_checklist_status
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Seed the two areas and their items (safe to run more than once — the
-- unique constraints make these no-ops on a second run).
-- ---------------------------------------------------------------------------

insert into staff_checklist_areas (code, name, sort_order) values
  ('safety_check', 'Children''s Worker Safety Checks', 1),
  ('contracts_hr', 'Contracts & HR File', 2)
on conflict (code) do nothing;

insert into staff_checklist_items (area_id, description, sort_order)
select a.id, item.description, item.sort_order
from staff_checklist_areas a
join (values
  ('safety_check', 'Written safety-checking procedure', 1),
  ('safety_check', 'Every children''s worker has a complete safety-check record', 2),
  ('safety_check', 'Checks completed before workers have access to children', 3),
  ('safety_check', 'Rechecks scheduled/completed every 3 years', 4),
  ('safety_check', 'Identity documents sighted/recorded', 5),
  ('safety_check', 'Name-change evidence where applicable', 6),
  ('safety_check', 'Police vet considered where required', 7),
  ('safety_check', 'Five-year work history obtained', 8),
  ('safety_check', 'Teaching Council registration confirmed where applicable', 9),
  ('safety_check', 'At least one appropriate referee checked', 10),
  ('safety_check', 'Interview completed', 11),
  ('safety_check', 'Risk assessment completed', 12),
  ('safety_check', 'Outcome of safety check recorded', 13),
  ('safety_check', 'Records retained for current employee', 14),
  ('contracts_hr', 'Signed employment agreement', 1),
  ('contracts_hr', 'Current job description', 2),
  ('contracts_hr', 'Identity evidence', 3),
  ('contracts_hr', 'CV/work history', 4),
  ('contracts_hr', 'Reference check', 5),
  ('contracts_hr', 'Interview/recruitment evidence', 6),
  ('contracts_hr', 'Children''s Worker Safety Check', 7),
  ('contracts_hr', 'Risk assessment', 8),
  ('contracts_hr', 'Police vet/recheck where required', 9),
  ('contracts_hr', 'Teaching Council registration/practising certificate where applicable', 10),
  ('contracts_hr', 'First Aid certificate where applicable', 11),
  ('contracts_hr', 'Induction completed', 12),
  ('contracts_hr', 'Appraisal/professional-growth documentation', 13),
  ('contracts_hr', 'Professional development records', 14),
  ('contracts_hr', 'Any required qualification evidence', 15),
  ('contracts_hr', 'Relevant visa/work entitlement documentation where applicable', 16)
) as item(area_code, description, sort_order) on item.area_code = a.code
on conflict (area_id, description) do nothing;

-- Beach Kids ERO Self-Audit Portal
-- Migration 0008: Make the staff checklist evidence-linked, and replace
-- the old 30-item Children's Worker Safety Check / Contracts & HR File
-- checklist with the shorter, practical "Safety Check" list Ethan
-- actually needs evidence for. Ticking an item off now happens by
-- uploading the real document (police vet, ID, staff profile form, first
-- aid cert, CV, job description, interview/recruitment evidence,
-- induction) — that upload lands in the normal staff_documents table (so
-- it also shows in the person's Documents list) and is linked back to the
-- checklist item so the tick always has real evidence behind it.
--
-- Run this in the Supabase SQL editor after 0001-0007 AND 0008a, in order.
-- (0008a adds the new document-category enum values this file uses —
-- Postgres requires those to be committed in an earlier, separate
-- transaction before they can be used here.)
--
-- IMPORTANT: this deletes the OLD checklist item rows by name (and, via
-- cascade, any per-staff tick/notes against them) and replaces them with
-- the new list below. It does not touch staff_documents — nothing already
-- uploaded is deleted. Safe to run more than once: it only ever removes
-- the specific old item descriptions below, and the new items are
-- inserted with on-conflict-do-nothing, so a second run is a no-op.

-- ---------------------------------------------------------------------------
-- staff_checklist_items — each item can now declare which document
-- category an uploaded evidence file should be filed under, and whether
-- it supports an expiry/renewal date (police vet, first aid — not
-- one-off items like ID or induction).
-- ---------------------------------------------------------------------------

alter table staff_checklist_items add column if not exists document_category staff_document_category;
alter table staff_checklist_items add column if not exists supports_expiry boolean not null default false;

-- ---------------------------------------------------------------------------
-- staff_checklist_status — link each tick to the actual evidence file
-- that was uploaded for it (a row in staff_documents). Nullable: a manual
-- tick with no file is still allowed, but uploading evidence is the
-- normal path.
-- ---------------------------------------------------------------------------

alter table staff_checklist_status add column if not exists document_id uuid references staff_documents(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Remove the old, more granular items by name (cascades to any per-staff
-- ticks against them). The "safety_check" AREA itself is kept and reused
-- below — only its old items go — so this never regenerates area ids on
-- a repeat run. The whole "contracts_hr" area is retired since none of
-- its items survive in the new list.
-- ---------------------------------------------------------------------------

delete from staff_checklist_items where description in (
  'Written safety-checking procedure',
  'Every children''s worker has a complete safety-check record',
  'Checks completed before workers have access to children',
  'Rechecks scheduled/completed every 3 years',
  'Identity documents sighted/recorded',
  'Name-change evidence where applicable',
  'Police vet considered where required',
  'Five-year work history obtained',
  'Teaching Council registration confirmed where applicable',
  'At least one appropriate referee checked',
  'Interview completed',
  'Risk assessment completed',
  'Outcome of safety check recorded',
  'Records retained for current employee',
  'Signed employment agreement',
  'Current job description',
  'Identity evidence',
  'CV/work history',
  'Reference check',
  'Interview/recruitment evidence',
  'Children''s Worker Safety Check',
  'Risk assessment',
  'Police vet/recheck where required',
  'Teaching Council registration/practising certificate where applicable',
  'First Aid certificate where applicable',
  'Induction completed',
  'Appraisal/professional-growth documentation',
  'Professional development records',
  'Any required qualification evidence',
  'Relevant visa/work entitlement documentation where applicable'
);

delete from staff_checklist_areas where code = 'contracts_hr';

insert into staff_checklist_areas (code, name, sort_order) values
  ('safety_check', 'Safety Check', 1)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into staff_checklist_items (area_id, description, sort_order, document_category, supports_expiry)
select a.id, item.description, item.sort_order, item.document_category::staff_document_category, item.supports_expiry
from staff_checklist_areas a
join (values
  ('safety_check', 'Police vet / safety check', 1, 'police_vet', true),
  ('safety_check', 'Identification', 2, 'identification', false),
  ('safety_check', 'Staff Profile Form', 3, 'staff_profile_form', false),
  ('safety_check', 'First Aid certificate (where applicable)', 4, 'first_aid', true),
  ('safety_check', 'CV / work history', 5, 'cv_work_history', false),
  ('safety_check', 'Job description', 6, 'job_description', false),
  ('safety_check', 'Interview / recruitment evidence', 7, 'interview_recruitment', false),
  ('safety_check', 'Induction', 8, 'induction', false)
) as item(area_code, description, sort_order, document_category, supports_expiry)
  on item.area_code = a.code
on conflict (area_id, description) do nothing;

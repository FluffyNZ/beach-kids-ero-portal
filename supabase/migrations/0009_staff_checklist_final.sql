-- Beach Kids ERO Self-Audit Portal
-- Migration 0009: Trim the Safety Check checklist down to exactly what
-- Ethan needs — Contract, Police vet / safety check, Child protection,
-- and Identification — and drop "Staff Profile" from the checklist
-- entirely (it's not a document; it becomes its own notes/info section on
-- the staff profile page instead, using the existing staff.notes field).
--
-- Run this in the Supabase SQL editor after 0001-0008a, in order. (0008a
-- adds the 'child_protection' enum value this file uses — it must be
-- committed in an earlier, separate transaction before it can be used
-- here, which is why it's not added inline in this file.)
--
-- This is written to land on the correct final state whether or not
-- 0008 has actually been run yet — it deletes old items by name from
-- BOTH the original 30-item list (0006) and the 8-item list (0008), and
-- inserts the 4 that should exist, all with on-conflict-do-nothing /
-- delete-if-present so it's safe to run more than once.

-- ---------------------------------------------------------------------------
-- Remove every item that shouldn't be on the checklist any more (covers
-- both the 0006 30-item list and the 0008 8-item list, so this works
-- regardless of which one is currently in place). Police vet / safety
-- check and Identification are NOT in this list — they stay.
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
  'Relevant visa/work entitlement documentation where applicable',
  'Staff Profile Form',
  'First Aid certificate (where applicable)',
  'CV / work history',
  'Job description',
  'Interview / recruitment evidence',
  'Induction'
);

-- ---------------------------------------------------------------------------
-- Make sure the "safety_check" area exists (in case neither 0006 nor
-- 0008 has run) and holds exactly the 4 items below.
-- ---------------------------------------------------------------------------

insert into staff_checklist_areas (code, name, sort_order) values
  ('safety_check', 'Safety Check', 1)
on conflict (code) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into staff_checklist_items (area_id, description, sort_order, document_category, supports_expiry)
select a.id, item.description, item.sort_order, item.document_category::staff_document_category, item.supports_expiry
from staff_checklist_areas a
join (values
  ('safety_check', 'Contract', 1, 'contract', false),
  ('safety_check', 'Police vet / safety check', 2, 'police_vet', true),
  ('safety_check', 'Child protection', 3, 'child_protection', true),
  ('safety_check', 'Identification', 4, 'identification', false)
) as item(area_code, description, sort_order, document_category, supports_expiry)
  on item.area_code = a.code
on conflict (area_id, description) do nothing;

-- Re-number in case Police vet / Identification already existed with the
-- old sort_order values from 0008 (2 and 4 respectively line up already,
-- but this keeps things correct if a future edit changes the order).
update staff_checklist_items set sort_order = 1 where description = 'Contract';
update staff_checklist_items set sort_order = 2 where description = 'Police vet / safety check';
update staff_checklist_items set sort_order = 3 where description = 'Child protection';
update staff_checklist_items set sort_order = 4 where description = 'Identification';

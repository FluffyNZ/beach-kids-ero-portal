-- Beach Kids ERO Self-Audit Portal
-- Migration 0011: Mark the 3 sleep-space criteria that only apply to
-- sessional services as Not Applicable, since Beach Kids operates as an
-- all-day service. Their all-day-service counterparts (PF33, PF34, PF37,
-- PF38) are unaffected and stay fully assessable.
--
-- These 3 are the only criteria in the 111-item ERO checklist explicitly
-- labelled "SESSIONAL SERVICES ONLY" in the source document:
--   PF32 — Sleep/Rest Space, Sessional Services (Over 2s)
--   PF35 — Sleep Space, Sessional Services (Under 2s)
--   PF36 — Sleep Furniture Ratio, Sessional Services (Under 2s)
--
-- Compliance is set to 'na' and evidence to 'not_required' (both existing,
-- legitimate statuses already used elsewhere in the app) — nothing is
-- marked compliant and no evidence is invented. A management note explains
-- why, but only when one isn't already there, so nothing you've already
-- typed gets overwritten. An activity log entry records the change; it
-- won't be duplicated on a re-run.
--
-- Run this in the Supabase SQL editor after 0001-0010. Safe to run more
-- than once.

insert into criterion_assessments (criterion_id, compliance_status, evidence_status, management_notes)
select
  c.id,
  'na'::compliance_status,
  'not_required'::evidence_status,
  'Sessional services only — Beach Kids operates as an all-day service, so this criterion does not apply.'
from ero_criteria c
where c.code in ('PF32', 'PF35', 'PF36')
on conflict (criterion_id) do update set
  compliance_status = 'na',
  evidence_status = 'not_required',
  management_notes = coalesce(
    nullif(criterion_assessments.management_notes, ''),
    excluded.management_notes
  );

insert into activity_log (criterion_id, entity_type, entity_id, event_type, description)
select
  c.id,
  'criterion',
  c.id,
  'marked_not_applicable',
  'Marked N/A — sessional services only, Beach Kids is an all-day service'
from ero_criteria c
where c.code in ('PF32', 'PF35', 'PF36')
  and not exists (
    select 1 from activity_log al
    where al.criterion_id = c.id and al.event_type = 'marked_not_applicable'
  );

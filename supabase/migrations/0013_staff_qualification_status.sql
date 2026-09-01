-- Beach Kids ERO Self-Audit Portal
-- Migration 0013: an explicit qualification status on staff_qualifications
-- — Not Qualified / Qualified / Student (in training) — instead of it being
-- guessed from whether qualification_level happened to be filled in.
-- Selecting "Qualified" in the UI is what reveals the qualification/pay
-- parity fields; selecting "Student (in training)" reveals the
-- study-tracking fields instead.
--
-- Existing rows are backfilled from their current data so nobody's status
-- silently resets when this runs:
--   - a row with a qualification_level already filled in becomes 'qualified'
--   - otherwise, a row with is_studying = true becomes 'studying'
--   - everything else becomes 'not_qualified'
--
-- Run this in the Supabase SQL editor after 0001-0012, in order. Safe to
-- run more than once.

do $$ begin
  create type staff_qualification_status as enum ('not_qualified', 'qualified', 'studying');
exception when duplicate_object then null; end $$;

alter table staff_qualifications
  add column if not exists qualification_status staff_qualification_status;

update staff_qualifications
set qualification_status = case
  when coalesce(nullif(trim(qualification_level), ''), '') <> '' then 'qualified'::staff_qualification_status
  when is_studying then 'studying'::staff_qualification_status
  else 'not_qualified'::staff_qualification_status
end
where qualification_status is null;

alter table staff_qualifications
  alter column qualification_status set default 'not_qualified',
  alter column qualification_status set not null;

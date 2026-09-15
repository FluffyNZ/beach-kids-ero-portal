-- Beach Kids ERO Self-Audit Portal
-- Migration 0033: Hazard Checks evidence — lets a Daily Hazard Checklist
-- link to a photo of the completed, signed paper form in the shared
-- Evidence Library, the same way Accident & Illness records already do.
-- This is what the new photo-import feature attaches to.
--
-- Run this in the Supabase SQL editor after 0001-0032, in order. Safe to
-- run more than once.

alter table hazard_checks
  add column if not exists evidence_id uuid references evidence(id) on delete set null;

create index if not exists idx_hazard_checks_evidence on hazard_checks(evidence_id);

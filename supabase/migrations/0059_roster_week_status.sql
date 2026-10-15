-- Beach Kids ERO Self-Audit Portal
-- Migration 0059: Roster week status — Draft/Approved, who approved a week
-- and when, and a lightweight "needs review" flag for changes made to a
-- week after it was approved.
--
-- Phase 1 of the Roster redesign (see the brief): the rest of the redesign
-- — leave & time off, cover/relievers, split shifts & non-contact time, and
-- a real date-aware coverage calculation — is deliberately left for later
-- migrations once each is reviewed on its own, rather than one large
-- schema change landing all at once.
--
-- needs_review is set back to true by the app whenever a shift in an
-- already-approved week is added, changed or removed (including via "Copy
-- previous week" landing on an approved week) — see markWeekTouchedIfApproved
-- in src/lib/actions/roster.ts. Approving the week again clears it.
--
-- Run this AFTER 0058_staff_note_attachments.sql.

do $$ begin
  create type roster_week_status as enum ('draft', 'approved');
exception when duplicate_object then null; end $$;

alter table roster_weeks
  add column if not exists status roster_week_status not null default 'draft',
  add column if not exists approved_by uuid references profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists needs_review boolean not null default false,
  add column if not exists last_modified_at timestamptz;

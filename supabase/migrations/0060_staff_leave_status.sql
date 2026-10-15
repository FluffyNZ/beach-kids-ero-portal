-- Beach Kids ERO Self-Audit Portal
-- Migration 0060: Phase 2 of the Roster redesign — leave & time off.
--
-- Extends the existing staff_leave table (the same table used by both the
-- Centre Calendar and Roster → Leave & availability — leave stays one
-- record wherever it's booked from, never duplicated into a second table)
-- with:
--
--   - status: requested / approved / declined / cancelled. New leave keeps
--     defaulting to 'approved' (Ethan confirmed this matches today's
--     one-step behaviour — entering leave today is already the record of a
--     decision made, e.g. transcribing a signed paper form), so nothing
--     changes for the existing flow unless you deliberately pick Requested
--     and approve/decline it afterwards.
--   - two new leave types: 'unavailable' (a one-off day someone can't work,
--     distinct from their regular weekly availability template on their own
--     profile) and 'day_off' (a day they're just not scheduled — no leave
--     entitlement used).
--   - start_time / end_time: optional, for a partial day off within a
--     single day (start_date = end_date). A multi-day block stays
--     whole-day only — enforced by the check constraint below.
--   - private_notes: a second notes field meant for office eyes only.
--     Same as everywhere else in this app (single shared login, all-
--     authenticated RLS below) there is no technical access boundary
--     enforcing that — it's simply left out of the public-facing views
--     (Calendar grid/list, Home "upcoming", Roster print) by the app code,
--     not by the database.
--   - decided_by / decided_at: who moved a request to Approved or Declined,
--     and when — same pattern as roster_weeks.approved_by/approved_at.
--
-- Existing rows (including the three backfilled from paper forms in
-- 0039_staff_leave_backfill.sql, already confirmed approved) get
-- status = 'approved' from the column default — nothing about them changes.
--
-- Run the two ALTER TYPE statements below ON THEIR OWN first (paste them
-- alone, click Run, let it finish) — same reason as 0008a/0016/0051:
-- Postgres won't let a brand-new enum value be used in the same
-- transaction that added it. THEN run the rest of this file as a second
-- step. Safe to run more than once.

alter type staff_leave_type add value if not exists 'unavailable';
alter type staff_leave_type add value if not exists 'day_off';

-- ---------------------------------------------------------------------------
-- Everything below this line: run as a second step, after both statements
-- above have completed successfully.
-- ---------------------------------------------------------------------------

do $$ begin
  create type staff_leave_status as enum ('requested', 'approved', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

alter table staff_leave
  add column if not exists status staff_leave_status not null default 'approved',
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists private_notes text,
  add column if not exists decided_by uuid references profiles(id),
  add column if not exists decided_at timestamptz;

do $$ begin
  alter table staff_leave
    add constraint staff_leave_partial_time_single_day
    check (start_time is null or end_time is null or start_date = end_date);
exception when duplicate_object then null; end $$;

-- Beach Kids ERO Self-Audit Portal
-- Migration 0048: Standing note for Kyrie Turnbull ("No sleeps"), requested
-- by Ethan so it's visible on the Weekly Booked Sessions roll.
--
-- Uses the existing child_enrolled_schedule.notes column (already there
-- since 0024, previously unused) — the app code change that surfaces this
-- column in the roll's Notes column ships alongside this migration.
--
-- Run this in the Supabase SQL editor after 0047, in order. Safe to run
-- more than once.

update child_enrolled_schedule ces set
  notes = 'No sleeps'
from children ch
where ces.child_id = ch.id and ch.full_name = 'Kyrie Turnbull';

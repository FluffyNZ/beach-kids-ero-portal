-- Beach Kids ERO Self-Audit Portal
-- Migration 0049: "To be confirmed" flag for a child's enrolled schedule.
--
-- Requested by Ethan: some children's booked days/times aren't settled yet
-- (e.g. Hudson, Toby, Ruiha, Luca on the 24 Sep roll). Rather than guessing
-- at hours or leaving stale ones showing, a child can now be flagged TBC —
-- the Weekly Booked Sessions roll shows "TBC" instead of their times and
-- does NOT count them in the daily booked totals, without losing whatever
-- times are already on file (so un-confirming later needs no re-entry).
--
-- Run this in the Supabase SQL editor after 0048, in order. Safe to run
-- more than once.

alter table child_enrolled_schedule
  add column if not exists tbc boolean not null default false;

-- Beach Kids ERO Self-Audit Portal
-- Migration 0046: Room moves confirmed with Ethan, following on from 0045
-- (24 September 2026 attendance roll).
--
-- Isabelle Higgins: Tainui -> Ohinemuri. Her booked hours also change
-- slightly (Friday now finishes 3:30pm, was 4:00pm) to match the roll.
--
-- Esme Frauendorf: Ohinemuri -> Pukewa. Her booked hours on the roll are
-- identical to what's already recorded, so only her room changes.
--
-- Indica Bidois was flagged alongside Esme as a possible Ohinemuri ->
-- Pukewa move (same pattern on the roll), but Ethan only confirmed Isabelle
-- and Esme here, so Indica is deliberately left untouched pending his
-- confirmation.
--
-- Run this in the Supabase SQL editor after 0045, in order. Safe to run
-- more than once.

update children set
  room_id = (select id from roster_rooms where name = 'Ohinemuri')
where full_name = 'Isabelle Higgins';

update child_enrolled_schedule ces set
  fri_end = time '15:30'
from children ch
where ces.child_id = ch.id and ch.full_name = 'Isabelle Higgins';

update children set
  room_id = (select id from roster_rooms where name = 'Pukewa')
where full_name = 'Esme Frauendorf';

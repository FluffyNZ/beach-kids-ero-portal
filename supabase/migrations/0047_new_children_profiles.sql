-- Beach Kids ERO Self-Audit Portal
-- Migration 0047: Bare profiles for three new children named on the 24
-- September 2026 attendance roll but not yet in the `children` table.
-- Ethan confirmed these are real new enrolments and asked for just the
-- profile + room for now — he'll fill in the rest (DOB, bill payer, etc.)
-- himself afterwards through the app, since none of that is in the roll
-- and shouldn't be guessed here.
--
-- Deliberately NOT included yet: their booked schedule
-- (child_enrolled_schedule). Add that once the profile details are
-- confirmed and it's clear the names below are complete/correct.
--
-- Malakai: roll footnote says "Malakai is in Tainui" (no surname given).
-- Millie Matich: Tainui.
-- Arryan: roll footnote places them in Pukewa (no surname given).
--
-- Run this in the Supabase SQL editor after 0046, in order. Safe to run
-- more than once (each insert is guarded so it won't create a duplicate if
-- this is re-run after a name already exists).

insert into children (full_name, room_id, status)
select 'Malakai', (select id from roster_rooms where name = 'Tainui'), 'active'
where not exists (select 1 from children where full_name = 'Malakai');

insert into children (full_name, room_id, status)
select 'Millie Matich', (select id from roster_rooms where name = 'Tainui'), 'active'
where not exists (select 1 from children where full_name = 'Millie Matich');

insert into children (full_name, room_id, status)
select 'Arryan', (select id from roster_rooms where name = 'Pukewa'), 'active'
where not exists (select 1 from children where full_name = 'Arryan');

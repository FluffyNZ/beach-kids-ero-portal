-- Beach Kids ERO Self-Audit Portal
-- Migration 0061: Relief/casual tag for staff.
--
-- Ethan wants some Float staff (people with no fixed home room) to show
-- under their own "Relief" heading on the Weekly roster instead of being
-- lumped in with the regular floating staff under "Float" -- Natasha Papps,
-- who covered three different rooms in the 19-23 Oct week, was the
-- motivating example.
--
-- This is deliberately NOT a 5th row in roster_rooms alongside Tainui /
-- Pukewa / Ohinemuri / Float: that table is shared well beyond the roster
-- (a child's enrolled room, accident/illness records, email room filters,
-- learning stories all pull their room options from it), and a "Relief"
-- room would wrongly become selectable in every one of those. is_relief is
-- a plain flag on the staff record itself -- it only changes which heading
-- a Float-grouped person sits under on the Weekly roster page. Which room
-- they're actually rostered to on a given shift still comes from the
-- normal Tainui/Pukewa/Ohinemuri/Float list, same as today.
--
-- Only Natasha Papps is flagged here, per Ethan -- everyone else stays as
-- they are. The app's Staff > employment tab now has its own "Relief /
-- casual" checkbox for flagging anyone else later, no migration needed.
--
-- Run this in the Supabase SQL editor after 0060, in order. Safe to run
-- more than once.

alter table staff add column if not exists is_relief boolean not null default false;

update staff set is_relief = true where full_name = 'Natasha Papps';

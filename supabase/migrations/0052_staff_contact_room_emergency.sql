-- Beach Kids ERO Self-Audit Portal
-- Migration 0052: Staff profile redesign — contact details, room
-- assignment, and a structured emergency contact.
--
-- Part of the Staff section redesign. Nothing here is backfilled with
-- invented data — every new column starts null ("Not recorded" in the UI)
-- until someone fills it in on the real profile.
--
-- Run this AFTER 0051_safety_check_enum_fix.sql, in the Supabase SQL editor.

alter table staff add column if not exists room_id uuid references roster_rooms(id) on delete set null;
alter table staff add column if not exists email text;
alter table staff add column if not exists mobile_phone text;

-- A structured emergency contact — previously there was no dedicated field
-- for this at all; the old `notes` free-text field's placeholder used to
-- suggest cramming it in there, which this replaces with real columns.
alter table staff add column if not exists emergency_contact_name text;
alter table staff add column if not exists emergency_contact_phone text;
alter table staff add column if not exists emergency_contact_relationship text;

create index if not exists idx_staff_room on staff(room_id);

-- Beach Kids ERO Self-Audit Portal
-- Migration 0024: Enrolled schedule (regular booked days/times) per child.
--
-- Source: Report_Children_Attendance_202608110920203589.pdf ("Children
-- Attendance 10-Aug-2026 to 16-Aug-2026", one page per room) — this is the
-- centre's own regular booking pattern for each child, Mon-Fri start/end
-- times. It's a *template* of what a normal week looks like, separate from
-- child_weekly_hours (0022), which records what actually happened in one
-- specific week. The fee engine now falls back to this enrolled schedule
-- to estimate a week's fees before anyone has entered that week's actual
-- hours — see the app code changes alongside this migration.
--
-- Amelia Claire Broomfield fix: 0020 flagged her room as ambiguous
-- ("Ohinemuri/Pukewa" in the original fees report). Ethan has now
-- confirmed she is not in Ohinemuri — all of her booked time belongs to
-- Pukewa. This migration sets her room to Pukewa and merges the one
-- Tuesday slot that appeared on the Ohinemuri page of this report into her
-- Pukewa schedule (Mon/Tue/Fri 08:15-15:15).
--
-- Run this in the Supabase SQL editor after 0019-0023, in order.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Amelia Claire Broomfield: room correction
-- ---------------------------------------------------------------------------

update children set
  room_id = (select id from roster_rooms where name = 'Pukewa'),
  room_notes = null
where full_name = 'Amelia Claire Broomfield';

-- ---------------------------------------------------------------------------
-- child_enrolled_schedule
-- ---------------------------------------------------------------------------

create table if not exists child_enrolled_schedule (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references children(id) on delete cascade,
  mon_start time, mon_end time,
  tue_start time, tue_end time,
  wed_start time, wed_end time,
  thu_start time, thu_end time,
  fri_start time, fri_end time,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

drop trigger if exists trg_child_enrolled_schedule_updated on child_enrolled_schedule;
create trigger trg_child_enrolled_schedule_updated before update on child_enrolled_schedule
  for each row execute procedure set_updated_at();

alter table child_enrolled_schedule enable row level security;

drop policy if exists "child_enrolled_schedule_all_authenticated" on child_enrolled_schedule;
create policy "child_enrolled_schedule_all_authenticated" on child_enrolled_schedule
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Seed from the attendance report — 50 children (every child that report
-- covers; the 4 added in 0023 without a room yet aren't in it, and get
-- their schedule once their enrolment details come through).
-- ---------------------------------------------------------------------------

insert into child_enrolled_schedule (child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
select ch.id, v.mon_start, v.mon_end, v.tue_start, v.tue_end, v.wed_start, v.wed_end, v.thu_start, v.thu_end, v.fri_start, v.fri_end
from (values
  ('Amelia Claire Broomfield', time '08:15', time '15:15', time '08:15', time '15:15', null, null, null, null, time '08:15', time '15:15'),
  ('Aneila Williams', null, null, time '09:00', time '15:00', null, null, time '09:00', time '15:00', time '09:00', time '15:00'),
  ('Aura Ormsby', time '09:00', time '14:00', time '09:00', time '14:00', null, null, time '09:00', time '14:00', null, null),
  ('Ava McPherson', time '08:30', time '14:30', null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30'),
  ('Brandon Wallace', time '08:30', time '14:30', null, null, time '08:30', time '14:30', time '08:30', time '14:30', null, null),
  ('Cecelia Carnachan', null, null, time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Daisy Stroobant', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Esme Frauendorf', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', null, null, null, null),
  ('Finn Keatley', time '08:00', time '15:00', null, null, time '08:00', time '16:00', time '08:00', time '16:00', null, null),
  ('Gray Spargo', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Indica Bidois', null, null, time '09:00', time '15:00', time '09:00', time '15:00', time '09:00', time '15:00', time '09:00', time '15:00'),
  ('Isla McPherson', time '08:30', time '14:30', null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30'),
  ('James Measures', time '08:30', time '14:30', null, null, time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Kingston O''Connell - Wharawhara', time '08:30', time '14:30', null, null, null, null, null, null, null, null),
  ('Kyrie Turnbull', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', null, null, time '08:30', time '14:30'),
  ('Ruiha Tamihere', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Tate Mcbirney', time '09:00', time '14:30', time '09:00', time '14:30', null, null, time '09:00', time '14:30', time '09:00', time '14:30'),
  ('Tatum Matich', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', null, null),
  ('Vardaan Singh Nehal', null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Will Chen', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '10:00', time '12:00'),
  ('Aaliyah De Bruin', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Aria Murray', time '08:30', time '14:30', time '08:30', time '14:30', null, null, null, null, time '08:30', time '14:30'),
  ('Aterea Johns', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Ella Mcbirney', time '08:30', time '14:30', time '08:30', time '14:30', null, null, time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Harlem Tangira-Paul', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', null, null, time '08:30', time '14:30'),
  ('Ihorei Wall-Church', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Kaabil Singh', time '08:00', time '15:00', time '08:00', time '15:00', time '08:00', time '15:00', time '08:00', time '15:00', time '08:00', time '15:30'),
  ('Kenny Choat', time '09:00', time '15:00', time '09:00', time '15:00', time '09:00', time '15:00', time '09:00', time '15:00', null, null),
  ('Kora Milanesi', null, null, null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30'),
  ('Oliver Obeda', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00'),
  ('Phoenix Cox', null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Princedeep Singh Savage', time '09:00', time '14:00', time '09:00', time '14:00', time '09:00', time '14:00', time '09:00', time '14:00', null, null),
  ('Roman Oakley', time '08:30', time '14:30', time '08:30', time '14:30', null, null, time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Samuel Higgins', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00'),
  ('Zac Jensen', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Amroz Kaur Nehal', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Archie Young', time '08:15', time '15:00', time '08:15', time '15:00', time '08:15', time '15:15', time '08:15', time '15:15', time '08:15', time '15:15'),
  ('Freya Singleton Wilson', null, null, null, null, null, null, time '08:00', time '16:00', time '08:00', time '16:00'),
  ('Hudson Carnachan', time '08:30', time '14:30', time '08:30', time '14:30', null, null, time '08:30', time '14:30', null, null),
  ('Isabelle Higgins', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00'),
  ('Koa Iti', time '09:00', time '12:00', time '09:00', time '12:00', time '09:00', time '12:00', time '09:00', time '12:00', time '09:00', time '14:30'),
  ('Layla Paul', time '09:00', time '14:30', time '09:00', time '14:30', time '09:00', time '14:30', time '09:00', time '14:30', null, null),
  ('Luca Williams', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('Maria Scheer', null, null, time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  ('McKenize Singh Savage', time '09:00', time '14:00', time '09:00', time '14:00', time '09:00', time '14:00', time '09:00', time '14:00', null, null),
  ('Micah Murray', time '08:00', time '16:00', time '08:00', time '16:00', null, null, time '08:00', time '16:00', time '08:30', time '14:30'),
  ('Ryder Milanesi', null, null, null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30'),
  ('Sean Lu', null, null, time '08:30', time '11:30', time '08:30', time '11:30', time '08:30', time '11:30', time '08:30', time '11:30'),
  ('Toby Carnachan', time '08:30', time '14:30', time '08:30', time '14:30', null, null, time '08:30', time '14:30', null, null),
  ('Violet Groenestein', time '08:30', time '14:30', null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30')
) as v(full_name, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
join children ch on ch.full_name = v.full_name
on conflict (child_id) do update set
  mon_start = excluded.mon_start, mon_end = excluded.mon_end,
  tue_start = excluded.tue_start, tue_end = excluded.tue_end,
  wed_start = excluded.wed_start, wed_end = excluded.wed_end,
  thu_start = excluded.thu_start, thu_end = excluded.thu_end,
  fri_start = excluded.fri_start, fri_end = excluded.fri_end;

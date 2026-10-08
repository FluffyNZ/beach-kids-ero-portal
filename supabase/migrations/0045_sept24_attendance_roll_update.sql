-- Beach Kids ERO Self-Audit Portal
-- Migration 0045: Booked-session updates from the 24 September 2026
-- attendance roll (Beach_Kids_Attendance_Roll_1.pdf), as confirmed with
-- Ethan in chat.
--
-- Scope: this migration ONLY touches children whose booked schedule in the
-- roll genuinely differs from what's currently in child_enrolled_schedule.
-- Most of the ~45 children on the roll already matched exactly and are left
-- alone. Several names on the roll are deliberately NOT included here and
-- need a separate decision/action — see the note at the end of this file.
--
-- Run this in the Supabase SQL editor after 0044, in order. Safe to run
-- more than once (each child's row is fully replaced, not appended).

-- ---------------------------------------------------------------------------
-- Schedule changes (Tainui)
-- ---------------------------------------------------------------------------

insert into child_enrolled_schedule (child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
select ch.id, v.mon_start, v.mon_end, v.tue_start, v.tue_end, v.wed_start, v.wed_end, v.thu_start, v.thu_end, v.fri_start, v.fri_end
from (values
  -- Friday finish moves from 4:00pm to 3:30pm; Mon-Thu unchanged.
  ('Freya Singleton Wilson', null, null, null, null, null, null, time '08:00', time '16:00', time '08:00', time '15:30'),
  -- Was Mon-Thu 9:00-12:00 + Fri 9:00-2:30; now Mon/Wed/Fri 9:00-2:30, Tue/Thu dropped.
  ('Koa Iti', time '09:00', time '14:30', null, null, time '09:00', time '14:30', null, null, time '09:00', time '14:30'),
  -- Was fully unbooked; now Tue/Thu 8:30-2:30.
  ('Lyla Seymour', null, null, time '08:30', time '14:30', null, null, time '08:30', time '14:30', null, null)
) as v(full_name, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
join children ch on ch.full_name = v.full_name
on conflict (child_id) do update set
  mon_start = excluded.mon_start, mon_end = excluded.mon_end,
  tue_start = excluded.tue_start, tue_end = excluded.tue_end,
  wed_start = excluded.wed_start, wed_end = excluded.wed_end,
  thu_start = excluded.thu_start, thu_end = excluded.thu_end,
  fri_start = excluded.fri_start, fri_end = excluded.fri_end;

-- ---------------------------------------------------------------------------
-- Schedule changes (Ohinemuri)
-- ---------------------------------------------------------------------------

insert into child_enrolled_schedule (child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
select ch.id, v.mon_start, v.mon_end, v.tue_start, v.tue_end, v.wed_start, v.wed_end, v.thu_start, v.thu_end, v.fri_start, v.fri_end
from (values
  -- Was Tue/Thu/Fri 9:00-3:00 only; now all 5 days 8:30-2:30.
  ('Aneila Williams', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  -- Was Mon/Wed/Fri 8:30-2:30; now all 5 days (Tue/Thu added).
  ('Isla McPherson', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  -- Monday dropped; Wed/Thu/Fri unchanged, Tue still not booked.
  ('James Measures', null, null, null, null, time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  -- Was fully unbooked; now all 5 days 8:30-2:30.
  ('Keonna Cerna', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30', time '08:30', time '14:30'),
  -- Was fully unbooked; now all 5 days 10:00-2:00.
  ('Rabab Jeph Sidhu', time '10:00', time '14:00', time '10:00', time '14:00', time '10:00', time '14:00', time '10:00', time '14:00', time '10:00', time '14:00')
) as v(full_name, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
join children ch on ch.full_name = v.full_name
on conflict (child_id) do update set
  mon_start = excluded.mon_start, mon_end = excluded.mon_end,
  tue_start = excluded.tue_start, tue_end = excluded.tue_end,
  wed_start = excluded.wed_start, wed_end = excluded.wed_end,
  thu_start = excluded.thu_start, thu_end = excluded.thu_end,
  fri_start = excluded.fri_start, fri_end = excluded.fri_end;

-- ---------------------------------------------------------------------------
-- Schedule changes (Pukewa)
-- ---------------------------------------------------------------------------

insert into child_enrolled_schedule (child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
select ch.id, v.mon_start, v.mon_end, v.tue_start, v.tue_end, v.wed_start, v.wed_end, v.thu_start, v.thu_end, v.fri_start, v.fri_end
from (values
  -- Friday finish moves from 4:00pm to 3:30pm; Mon-Thu unchanged.
  ('Oliver Obeda', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '16:00', time '08:00', time '15:30')
) as v(full_name, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end)
join children ch on ch.full_name = v.full_name
on conflict (child_id) do update set
  mon_start = excluded.mon_start, mon_end = excluded.mon_end,
  tue_start = excluded.tue_start, tue_end = excluded.tue_end,
  wed_start = excluded.wed_start, wed_end = excluded.wed_end,
  thu_start = excluded.thu_start, thu_end = excluded.thu_end,
  fri_start = excluded.fri_start, fri_end = excluded.fri_end;

-- ---------------------------------------------------------------------------
-- Enrolments ended
-- ---------------------------------------------------------------------------

-- Gray Spargo: Ethan confirmed leave out / mark as left.
update children set status = 'left'
where full_name = 'Gray Spargo' and status <> 'left';

-- Harlem Tangira-Paul: no longer on the roll; Ethan confirmed mark as left.
update children set status = 'left'
where full_name = 'Harlem Tangira-Paul' and status <> 'left';

-- ---------------------------------------------------------------------------
-- Deliberately NOT included in this migration — needs a decision from Ethan
-- before any data changes:
--
-- * Hudson Carnachan, Toby Carnachan, Luca Williams, Ruiha Tamihere: the
--   roll itself flags their hours as unconfirmed/assumed, or Ethan asked
--   to hold off. Current schedule left untouched.
-- * Kaabil Singh, Samuel Higgins: confirmed still enrolled in Pukewa as-is,
--   just not mentioned on this particular roll. No change made.
-- * Malakai, Millie Matich, Arryan: new children, not yet in the `children`
--   table. Ethan confirmed they should be added — needs the normal "Add a
--   new enrolment" flow (DOB, room, bill payer, etc. aren't in the roll and
--   shouldn't be guessed), then their schedule can be set the same way.
-- * Isabelle Higgins, Esme Frauendorf, Indica Bidois: the roll's layout
--   suggests a room change (Isabelle/Toby -> Ohinemuri, Esme/Indica ->
--   Pukewa) but only Toby's move was stated as confirmed fact. Flagged for
--   Ethan to confirm before anything moves.
-- * Toby Carnachan currently appears to exist as TWO separate child records
--   (one in Tainui, one in Ohinemuri, with different schedules) — flagged
--   for Ethan, not something to silently merge or delete.
-- ---------------------------------------------------------------------------

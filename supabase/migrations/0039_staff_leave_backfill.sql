-- Beach Kids ERO Self-Audit Portal
-- Migration 0039: Three approved staff leave requests from paper Request
-- for Leave forms Ethan photographed on 2026-09-22.
--
-- All three are marked approved (Ethan confirmed all three in chat) and
-- are matched to their staff member by exact full_name + status = 'active'
-- (same convention as every other data-backfill migration in this
-- project). Hours/reason from each form are kept in the notes field,
-- since staff_leave only tracks whole-day date ranges, not hours.
--
-- Run this in the Supabase SQL editor after 0038_staff_child_birthdates.sql.
-- Safe to run more than once — each insert is skipped if a leave row for
-- that staff member already exists over the same date range.

insert into staff_leave (staff_id, leave_type, start_date, end_date, notes)
select s.id, v.leave_type::staff_leave_type, v.start_date, v.end_date, v.notes
from (
  values
    (
      'Rebecca Higgins',
      'unpaid',
      date '2026-12-29',
      date '2026-12-31',
      'Leave without pay — holiday over Christmas. 17hrs 15min. Form submitted and signed 17 Aug 2026, approved.'
    ),
    (
      'Michelle Burr',
      'annual',
      date '2026-11-04',
      date '2026-11-04',
      'Annual leave — medical appointment. 6.5 hours. Form submitted and signed 1 Sep 2026, approved.'
    ),
    (
      'Rebecca Higgins',
      'unpaid',
      date '2026-10-19',
      date '2026-10-20',
      'Leave without pay — Hilary Duff concert. 2 days. Form submitted and signed 14 Sep 2026, approved.'
    )
) as v(full_name, leave_type, start_date, end_date, notes)
join staff s on s.full_name = v.full_name and s.status = 'active'
where not exists (
  select 1 from staff_leave sl
  where sl.staff_id = s.id
    and sl.start_date = v.start_date
    and sl.end_date = v.end_date
);

-- Verification — should return zero rows. Anything listed here means a
-- form's staff name didn't match a currently active staff member (worth
-- double-checking the spelling for).
select v.full_name
from (values ('Rebecca Higgins'), ('Michelle Burr')) as v(full_name)
where not exists (
  select 1 from staff s where s.full_name = v.full_name and s.status = 'active'
);

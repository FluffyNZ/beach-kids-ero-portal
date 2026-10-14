-- Beach Kids ERO Self-Audit Portal
-- Migration 0054: Staff weekly availability — a template of the days/times
-- a person is generally available to work, same Mon-Fri start/end shape as
-- child_enrolled_schedule (0024). This is deliberately separate from both
-- staff.min_hours (their agreed/contracted minimum hours) and the actual
-- roster_shifts system (what they're rostered on in a given week) — the
-- brief asks for contracted hours, availability and rostered shifts to
-- stay clearly distinct and never overwrite one another, so each lives in
-- its own place: min_hours on staff, availability here, real shifts in
-- roster_shifts.
--
-- Run this AFTER 0053_staff_recognised_service.sql.

create table if not exists staff_availability (
  staff_id uuid primary key references staff(id) on delete cascade,
  mon_start time, mon_end time,
  tue_start time, tue_end time,
  wed_start time, wed_end time,
  thu_start time, thu_end time,
  fri_start time, fri_end time,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

drop trigger if exists trg_staff_availability_updated on staff_availability;
create trigger trg_staff_availability_updated before update on staff_availability
  for each row execute procedure set_updated_at();

alter table staff_availability enable row level security;

drop policy if exists "staff_availability_all_authenticated" on staff_availability;
create policy "staff_availability_all_authenticated" on staff_availability
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

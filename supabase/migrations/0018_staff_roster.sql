-- Beach Kids ERO Self-Audit Portal
-- Migration 0018: Staff Roster — a dated, week-by-week roster grid (Monday
-- to Friday) showing which room each staff member is rostered in and what
-- time they're working, matching the paper/whiteboard roster format Ethan
-- already uses. Each week is its own record so past weeks stay on file and
-- one-off changes don't disturb the regular pattern.
--
-- Nothing about who works when is assumed here — only the four room names
-- from the existing roster (Tainui, Pukewa, Ohinemuri, Float) are seeded.
-- Every shift (who, which room, what time, which week) is entered through
-- the app itself.
--
-- Run this in the Supabase SQL editor after 0001-0017, in order. Safe to
-- run more than once.

create table if not exists roster_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- One of the Tailwind colour families already used across the app
  -- (kelp | blue | pink | orange), so the roster reuses the same palette
  -- instead of inventing new colours. The UI maps this to real classes.
  color text not null,
  sort_order int not null default 0
);

insert into roster_rooms (name, color, sort_order)
values
  ('Tainui', 'kelp', 1),
  ('Pukewa', 'blue', 2),
  ('Ohinemuri', 'pink', 3),
  ('Float', 'orange', 4)
on conflict (name) do nothing;

create table if not exists roster_weeks (
  id uuid primary key default gen_random_uuid(),
  -- The Monday of the week this roster covers.
  week_start_date date not null unique,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

create index if not exists idx_roster_weeks_start on roster_weeks(week_start_date desc);

create table if not exists roster_shifts (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references roster_weeks(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  room_id uuid references roster_rooms(id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One shift per person per day within a given week — matches the grid
  -- (one cell per person per day). Editing a cell updates this row rather
  -- than creating a second one.
  unique (week_id, staff_id, shift_date)
);

create index if not exists idx_roster_shifts_week on roster_shifts(week_id);
create index if not exists idx_roster_shifts_staff on roster_shifts(staff_id);

alter table roster_rooms enable row level security;
alter table roster_weeks enable row level security;
alter table roster_shifts enable row level security;

drop policy if exists "roster_rooms_all_authenticated" on roster_rooms;
create policy "roster_rooms_all_authenticated" on roster_rooms
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "roster_weeks_all_authenticated" on roster_weeks;
create policy "roster_weeks_all_authenticated" on roster_weeks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "roster_shifts_all_authenticated" on roster_shifts;
create policy "roster_shifts_all_authenticated" on roster_shifts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists trg_roster_shifts_updated on roster_shifts;
create trigger trg_roster_shifts_updated before update on roster_shifts
  for each row execute procedure set_updated_at();

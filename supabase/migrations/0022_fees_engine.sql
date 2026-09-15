-- Beach Kids ERO Self-Audit Portal
-- Migration 0022: Fee calculation engine — phase two of the fees area.
--
-- Adds what was deliberately left out of the phase-one profile structure
-- (0019/0020): a place to enter each child's actual hours for a given
-- week, a centre-wide fee_settings row for the numbers that apply to
-- every child (hourly rate, sibling discount %, 20 Hours ECE caps), and
-- the weekly fee is then calculated in the app from:
--   children.hourly_rate / twenty_hours_ece / special_weekly_override
--   + child_weekly_hours (this migration)
--   + fee_settings (this migration)
-- exactly the same rules as the uploaded fees report used.
--
-- fee_weeks / child_weekly_hours mirror the existing roster_weeks /
-- roster_shifts shape on purpose — Mon–Fri hours per child per week,
-- one row per child per week rather than one row per day, since that's
-- how the source fees report itself lays hours out.
--
-- Run this in the Supabase SQL editor after 0019, 0020 and 0021, in
-- order. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- fee_settings — a single row of centre-wide numbers. Seeded with the real
-- values from the uploaded fees report's own Assumptions tab (not
-- invented): $7.50/hour, 10% sibling discount, 20 Hours ECE capped at 6
-- hours/day and 20 hours/week.
-- ---------------------------------------------------------------------------

create table if not exists fee_settings (
  id boolean primary key default true,
  standard_hourly_rate numeric(10,2) not null default 7.50,
  sibling_discount_percent numeric(4,3) not null default 0.10,
  ece_daily_max_hours numeric(5,2) not null default 6,
  ece_weekly_max_hours numeric(5,2) not null default 20,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  constraint fee_settings_singleton check (id)
);

insert into fee_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists trg_fee_settings_updated on fee_settings;
create trigger trg_fee_settings_updated before update on fee_settings
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- fee_weeks / child_weekly_hours — one row per child per week, Mon–Fri
-- hours, the same layout as the source fees report.
-- ---------------------------------------------------------------------------

create table if not exists fee_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_fee_weeks_start on fee_weeks(week_start_date desc);

create table if not exists child_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references fee_weeks(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  mon_hours numeric(5,2) not null default 0,
  tue_hours numeric(5,2) not null default 0,
  wed_hours numeric(5,2) not null default 0,
  thu_hours numeric(5,2) not null default 0,
  fri_hours numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, child_id)
);

create index if not exists idx_child_weekly_hours_week on child_weekly_hours(week_id);
create index if not exists idx_child_weekly_hours_child on child_weekly_hours(child_id);

drop trigger if exists trg_child_weekly_hours_updated on child_weekly_hours;
create trigger trg_child_weekly_hours_updated before update on child_weekly_hours
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table fee_settings enable row level security;
alter table fee_weeks enable row level security;
alter table child_weekly_hours enable row level security;

drop policy if exists "fee_settings_all_authenticated" on fee_settings;
create policy "fee_settings_all_authenticated" on fee_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "fee_weeks_all_authenticated" on fee_weeks;
create policy "fee_weeks_all_authenticated" on fee_weeks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "child_weekly_hours_all_authenticated" on child_weekly_hours;
create policy "child_weekly_hours_all_authenticated" on child_weekly_hours
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

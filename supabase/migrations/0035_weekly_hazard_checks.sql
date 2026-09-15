-- Beach Kids ERO Self-Audit Portal
-- Migration 0035: Weekly Hazard Checks — one chart per room per week, with
-- its own sign-off (staff + time) for each day of that week, instead of a
-- separate check per room per day.
--
-- hazard_checks becomes the WEEK header: room_id + week_start_date (the
-- Monday of that week — matches the same Monday-anchored week already used
-- by roster/fees, via lib/utils.mondayOf), the tick-box items and hazard
-- log still hang off it exactly as before. The old per-check staff_id /
-- completed_time / signed_off / signed_off_at columns move to a new child
-- table, hazard_check_daily_signoffs, one row per weekday (Monday–Friday)
-- of that week, each independently signed by whoever actually did that
-- day's walk-through.
--
-- There is no real data to migrate here — the live database has never had
-- the hazard_checks tables populated (0032/0033 hadn't been run yet), so
-- this is a straight structural change, not a data migration.
--
-- Run this in the Supabase SQL editor after 0034, in order. Safe to run
-- more than once.

-- ---------------------------------------------------------------------------
-- hazard_checks: check_date -> week_start_date; drop the per-day sign-off
-- columns (moving to hazard_check_daily_signoffs below).
--
-- Both blocks below are guarded so this really is safe to run again: a
-- plain "rename column check_date" or "add constraint" would otherwise
-- error out on a second run once the first run has already renamed the
-- column / added the constraint.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hazard_checks' and column_name = 'check_date'
  ) then
    alter table hazard_checks rename column check_date to week_start_date;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'hazard_checks_room_id_check_date_key') then
    alter table hazard_checks drop constraint hazard_checks_room_id_check_date_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hazard_checks_room_id_week_start_date_key') then
    alter table hazard_checks add constraint hazard_checks_room_id_week_start_date_key unique (room_id, week_start_date);
  end if;
end $$;

alter table hazard_checks drop column if exists staff_id;
alter table hazard_checks drop column if exists completed_time;
alter table hazard_checks drop column if exists signed_off;
alter table hazard_checks drop column if exists signed_off_at;

comment on column hazard_checks.week_start_date is 'The Monday of the week this chart covers (see lib/utils.mondayOf).';

-- ---------------------------------------------------------------------------
-- hazard_check_daily_signoffs — one row per weekday of a hazard_checks week,
-- each with its own staff member, time, and signed-off state. Mirrors the
-- real paper chart's "Mon / Tue / Wed / Thu / Fri" sign-off columns.
-- ---------------------------------------------------------------------------

create table if not exists hazard_check_daily_signoffs (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references hazard_checks(id) on delete cascade,
  check_date date not null,
  staff_id uuid references staff(id) on delete set null,
  completed_time time,
  signed_off boolean not null default false,
  signed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (check_id, check_date)
);

create index if not exists idx_hazard_daily_signoffs_check on hazard_check_daily_signoffs(check_id);
create index if not exists idx_hazard_daily_signoffs_date on hazard_check_daily_signoffs(check_date);

drop trigger if exists trg_hazard_daily_signoffs_updated on hazard_check_daily_signoffs;
create trigger trg_hazard_daily_signoffs_updated before update on hazard_check_daily_signoffs
  for each row execute procedure set_updated_at();

alter table hazard_check_daily_signoffs enable row level security;

drop policy if exists "authenticated_all_hazard_daily_signoffs" on hazard_check_daily_signoffs;
create policy "authenticated_all_hazard_daily_signoffs" on hazard_check_daily_signoffs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

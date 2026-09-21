-- Beach Kids ERO Self-Audit Portal
-- Migration 0037: Centre Calendar — NZ public holidays (computed in the
-- app, not stored here — see src/lib/nz-public-holidays.ts), staff leave,
-- and staff/child birthdays.
--
-- Public holidays need no table: they're calculated from the Holidays Act
-- 2003 rules plus the gazetted Matariki dates, entirely in application
-- code, so there's nothing here to seed or keep in sync year to year.
--
-- Birthdays need a real date of birth on file to show up — nothing is
-- inferred from a child's stored age (that's just an age-as-of snapshot,
-- not a birth date) or fabricated from anywhere else. The calendar simply
-- has nothing to show for a person until their date of birth is entered
-- on their profile.
--
-- Run this in the Supabase SQL editor after 0001-0036, in order. Safe to
-- run more than once.

do $$ begin
  create type staff_leave_type as enum ('annual', 'sick', 'unpaid', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Birthdays — added to the two profile tables that already exist. Both
-- nullable: nothing changes for anyone until Ethan fills theirs in.
-- ---------------------------------------------------------------------------

do $$ begin
  alter table staff add column date_of_birth date;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table children add column date_of_birth date;
exception when duplicate_column then null; end $$;

-- ---------------------------------------------------------------------------
-- staff_leave — one row per booked block of leave. A whole block moves as
-- one unit (no per-day rows), since that's how leave is actually granted
-- and it's what "select staff + a date range" naturally produces.
-- ---------------------------------------------------------------------------

create table if not exists staff_leave (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  leave_type staff_leave_type not null default 'annual',
  start_date date not null,
  end_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  constraint staff_leave_dates_valid check (end_date >= start_date)
);

create index if not exists idx_staff_leave_staff on staff_leave(staff_id);
create index if not exists idx_staff_leave_dates on staff_leave(start_date, end_date);

drop trigger if exists trg_staff_leave_updated on staff_leave;
create trigger trg_staff_leave_updated before update on staff_leave
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — uniform with the rest of the app: any authenticated user.
-- ---------------------------------------------------------------------------

alter table staff_leave enable row level security;

drop policy if exists "authenticated_all_staff_leave" on staff_leave;
create policy "authenticated_all_staff_leave" on staff_leave
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

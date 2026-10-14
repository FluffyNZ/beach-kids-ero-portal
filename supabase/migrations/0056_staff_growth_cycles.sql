-- Beach Kids ERO Self-Audit Portal
-- Migration 0056: Professional Growth — a staff member's current/past
-- growth cycle(s), each with its own goals. A first pass: one open cycle
-- at a time is the expected normal use (the UI leads with the current
-- one), but nothing here stops recording more than one over time, so
-- history is kept rather than overwritten when a new cycle starts.
--
-- Distinct from the existing "Professional Growth Cycle record" document
-- category (staff_documents.category = 'professional_growth_cycle', used
-- for filing evidence PDFs) — that still works as-is for attaching files;
-- this adds the actual goals/reflections/review-date tracking the brief
-- asks for, which didn't exist anywhere before.
--
-- Run this AFTER 0055_staff_notes.sql.

create table if not exists staff_growth_cycles (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  title text not null,
  start_date date,
  review_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  reflections text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_staff_growth_cycles_staff on staff_growth_cycles(staff_id);

drop trigger if exists trg_staff_growth_cycles_updated on staff_growth_cycles;
create trigger trg_staff_growth_cycles_updated before update on staff_growth_cycles
  for each row execute procedure set_updated_at();

create table if not exists staff_growth_goals (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references staff_growth_cycles(id) on delete cascade,
  description text not null,
  is_complete boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_growth_goals_cycle on staff_growth_goals(cycle_id);

alter table staff_growth_cycles enable row level security;
alter table staff_growth_goals enable row level security;

drop policy if exists "staff_growth_cycles_all_authenticated" on staff_growth_cycles;
create policy "staff_growth_cycles_all_authenticated" on staff_growth_cycles
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff_growth_goals_all_authenticated" on staff_growth_goals;
create policy "staff_growth_goals_all_authenticated" on staff_growth_goals
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

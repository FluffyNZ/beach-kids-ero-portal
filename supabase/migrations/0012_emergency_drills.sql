-- Beach Kids ERO Self-Audit Portal
-- Migration 0012: Emergency Drill Register — a structured form for logging
-- each emergency drill (fire evacuation, earthquake, tsunami, lockdown),
-- instead of just uploading a generic file. Ties directly to Criterion
-- HS8 ("Emergency Drills"), whose documentation requirement (per the
-- official ERO Self-Audit Checklist, verbatim) is:
--   "A record of emergency drills carried out and evidence of how
--   evaluation of the drills has informed the annual review of the
--   service's emergency plan."
--
-- Run this in the Supabase SQL editor after 0001-0011, in order. Safe to
-- run more than once.

do $$ begin
  create type emergency_drill_type as enum ('fire_evacuation', 'earthquake', 'tsunami', 'lockdown', 'other');
exception when duplicate_object then null; end $$;

create table if not exists emergency_drills (
  id uuid primary key default gen_random_uuid(),
  drill_type emergency_drill_type not null,
  drill_date date not null,
  duration_minutes integer,
  -- Lockdown drills are commonly practised by staff without children
  -- present, to avoid distress — everything else normally involves them.
  children_involved boolean not null default true,
  children_present integer,
  staff_present integer,
  assembly_point text,
  conducted_by text,
  what_happened text,
  what_went_well text,
  improvements_needed text,
  -- The bit ERO explicitly wants: how this drill's evaluation feeds the
  -- annual review of the written emergency plan (Criterion HS7).
  evaluation_notes text,
  next_due_date date,
  evidence_id uuid references evidence(id) on delete set null,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_emergency_drills_date on emergency_drills(drill_date desc);

alter table emergency_drills enable row level security;

drop policy if exists "emergency_drills_all_authenticated" on emergency_drills;
create policy "emergency_drills_all_authenticated" on emergency_drills
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists trg_emergency_drills_updated on emergency_drills;
create trigger trg_emergency_drills_updated before update on emergency_drills
  for each row execute procedure set_updated_at();

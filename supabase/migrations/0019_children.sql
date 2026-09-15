-- Beach Kids ERO Self-Audit Portal
-- Migration 0019: Children & Fees — profile structure.
--
-- This is phase one of the fees area: real child profiles, their real
-- bill payer (the adult who is billed / pays fees, usually a parent or
-- caregiver), which room they're in, and the per-child settings the fee
-- calculation actually depends on (a per-child hourly rate override, the
-- 20 Hours ECE subsidy flag, a special agreed weekly rate override, and
-- their current Work and Income (WINZ) Child Care Subsidy details).
--
-- Sibling discounts are NOT stored anywhere here — they're derived
-- automatically (a bill payer with more than one active child qualifies),
-- exactly like the uploaded fees report does it. There is nothing to keep
-- in sync.
--
-- The actual week-by-week attendance hours / calculated fee / invoicing
-- engine is a later phase, once this profile structure is in use. This
-- migration only creates the people and their fee *settings*.
--
-- Run this in the Supabase SQL editor after 0001-0018, in order. Safe to
-- run more than once.
--
-- IMPORTANT: do not seed fake children or bill payers. The only data this
-- migration (and the seed migration that follows it, 0020) inserts is
-- real data transcribed directly from a real uploaded fees report — add
-- any further children/bill payers as real people through the app itself.

do $$ begin
  create type child_status as enum ('active', 'left');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- bill_payers — the adult who is billed for a child's fees (usually a
-- parent or caregiver). Kept separate from `children` because one bill
-- payer is very often billed for more than one child (siblings), and this
-- is also the natural place to eventually match against a Xero contact.
-- ---------------------------------------------------------------------------

create table if not exists bill_payers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

drop trigger if exists trg_bill_payers_updated on bill_payers;
create trigger trg_bill_payers_updated before update on bill_payers
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- children — the profile. Age is stored as the years/months + "as of"
-- date it was reported as (from the child details report), rather than a
-- date of birth, since only that age snapshot was supplied.
--
-- `room_id` links to the same `roster_rooms` table the staff roster
-- already uses (Tainui / Pukewa / Ohinemuri / Float) rather than a second
-- room list. `room_notes` is for the rare case a child's room isn't a
-- clean single match (e.g. recorded as shared between two rooms).
--
-- `bill_payer_id` is nullable — a child can exist in the system with no
-- confirmed bill payer yet, with `bill_payer_unlisted_note` recording why
-- (e.g. "not listed in contact report") until it's confirmed.
-- ---------------------------------------------------------------------------

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  age_years int,
  age_months int,
  age_as_of date,
  room_id uuid references roster_rooms(id) on delete set null,
  room_notes text,
  bill_payer_id uuid references bill_payers(id) on delete set null,
  bill_payer_unlisted_note text,
  status child_status not null default 'active',
  -- Fee settings this child's fee will be calculated from once the fee
  -- engine phase is built. Null hourly_rate means "use the centre's
  -- standard hourly rate" rather than a per-child override.
  hourly_rate numeric(10,2),
  twenty_hours_ece boolean not null default false,
  special_weekly_override numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_children_status on children(status);
create index if not exists idx_children_bill_payer on children(bill_payer_id);
create index if not exists idx_children_room on children(room_id);

drop trigger if exists trg_children_updated on children;
create trigger trg_children_updated before update on children
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- child_winz_subsidies — one current snapshot per child of their Work and
-- Income Child Care Subsidy details, if they have one. `caregiver_name`
-- is kept exactly as it appears on the WINZ statement even when it's a
-- fuller/different form of the bill payer's name — it isn't assumed to
-- be the same value and isn't overwritten to match.
-- ---------------------------------------------------------------------------

create table if not exists child_winz_subsidies (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references children(id) on delete cascade,
  caregiver_name text,
  weekly_cca_hours numeric(6,2),
  weekly_payment numeric(10,2),
  renewal_date date,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

drop trigger if exists trg_child_winz_subsidies_updated on child_winz_subsidies;
create trigger trg_child_winz_subsidies_updated before update on child_winz_subsidies
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — same "any authenticated user may read/write" shape
-- as the rest of this single-organisation app.
-- ---------------------------------------------------------------------------

alter table bill_payers enable row level security;
alter table children enable row level security;
alter table child_winz_subsidies enable row level security;

drop policy if exists "bill_payers_all_authenticated" on bill_payers;
create policy "bill_payers_all_authenticated" on bill_payers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "children_all_authenticated" on children;
create policy "children_all_authenticated" on children
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "child_winz_subsidies_all_authenticated" on child_winz_subsidies;
create policy "child_winz_subsidies_all_authenticated" on child_winz_subsidies
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

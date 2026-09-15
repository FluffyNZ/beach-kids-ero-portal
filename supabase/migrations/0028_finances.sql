-- Beach Kids ERO Self-Audit Portal
-- Migration 0028: Finances — a place to record overheads/outgoings (bills
-- you receive) and income (MOE funding, invoices you issue to parents, and
-- anything else), sitting alongside the automatically-calculated parent
-- fee revenue already produced by the Children & Fees area.
--
-- Deliberately left out for now, per instruction: GST return periods/
-- filing-frequency tracking (GST is handled elsewhere already) and any
-- computed tax-owed figure — the Finances Overview only ever shows an
-- "estimated profit before tax" as a rough figure, not a tax calculation,
-- since that's not something this app should present as authoritative.
--
-- Run this in the Supabase SQL editor after 0001-0027, in order. Safe to
-- run more than once.

do $$ begin
  create type finance_payment_status as enum ('unpaid', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type finance_income_status as enum ('pending', 'received');
exception when duplicate_object then null; end $$;

do $$ begin
  create type finance_income_source as enum ('moe_funding', 'parent_invoice', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- finance_outgoings — overheads, bills and other outgoings. `amount` is
-- the GST-inclusive total (what a receipt/bank statement shows);
-- `gst_amount` is an optional note of the GST portion for your own
-- records, not used for any GST return calculation here.
-- ---------------------------------------------------------------------------

create table if not exists finance_outgoings (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  supplier text,
  category text,
  description text,
  amount numeric(10,2) not null,
  gst_amount numeric(10,2),
  status finance_payment_status not null default 'unpaid',
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_finance_outgoings_date on finance_outgoings(expense_date desc);
create index if not exists idx_finance_outgoings_status on finance_outgoings(status);

drop trigger if exists trg_finance_outgoings_updated on finance_outgoings;
create trigger trg_finance_outgoings_updated before update on finance_outgoings
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- finance_income — MOE funding, invoices issued to parents, and anything
-- else outside the automatically-calculated weekly parent fee revenue.
-- ---------------------------------------------------------------------------

create table if not exists finance_income (
  id uuid primary key default gen_random_uuid(),
  income_date date not null,
  source finance_income_source not null default 'other',
  payer_name text,
  description text,
  invoice_number text,
  amount numeric(10,2) not null,
  gst_amount numeric(10,2),
  status finance_income_status not null default 'pending',
  due_date date,
  received_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_finance_income_date on finance_income(income_date desc);
create index if not exists idx_finance_income_status on finance_income(status);

drop trigger if exists trg_finance_income_updated on finance_income;
create trigger trg_finance_income_updated before update on finance_income
  for each row execute procedure set_updated_at();

alter table finance_outgoings enable row level security;
alter table finance_income enable row level security;

drop policy if exists "finance_outgoings_all_authenticated" on finance_outgoings;
create policy "finance_outgoings_all_authenticated" on finance_outgoings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "finance_income_all_authenticated" on finance_income;
create policy "finance_income_all_authenticated" on finance_income
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

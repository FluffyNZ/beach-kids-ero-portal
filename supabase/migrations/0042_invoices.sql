-- Beach Kids ERO Self-Audit Portal
-- Migration 0042: Parent fee invoices + statements.
--
-- An invoice is a FROZEN SNAPSHOT of a family's fee numbers at the moment
-- it's drafted — it does not recalculate if hours are edited afterwards,
-- so a sent invoice always matches what the parent was actually told they
-- owe, even if this week's hours get corrected later. Children & Fees /
-- Fees by family stay the live, always-current view; invoices are the
-- point-in-time record drawn from that view.
--
-- "Currently owing" (for statements) is simply the sum of every invoice
-- for a family that's been sent but not yet paid or voided — there is no
-- automatic payment matching here. You mark an invoice paid yourself once
-- you've reconciled it in Xero/your bank, same as any other manual
-- bookkeeping step today. A live Xero payment-matching integration is a
-- separate, bigger piece that can slot in later without changing this
-- schema — it would just add an automatic way to flip the same "paid" flag.
--
-- Run this in the Supabase SQL editor after 0001-0041, in order. Safe to
-- run more than once.

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'void');
exception when duplicate_object then null; end $$;

-- Sequential, human-readable invoice numbers (BK-INV-0001, BK-INV-0002, ...).
create sequence if not exists invoice_number_seq;

-- ---------------------------------------------------------------------------
-- invoices — one per family (bill payer) per billing week. subtotal/
-- winz_total/total_due are copied in at draft time from Fees by family;
-- total_due is what's actually owed by the parent (fee total minus WINZ).
-- ---------------------------------------------------------------------------

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  bill_payer_id uuid not null references bill_payers(id) on delete restrict,
  week_start_date date not null,
  invoice_number text not null unique default ('BK-INV-' || lpad(nextval('invoice_number_seq')::text, 4, '0')),
  status invoice_status not null default 'draft',
  subtotal numeric(10,2) not null default 0,
  winz_total numeric(10,2) not null default 0,
  total_due numeric(10,2) not null default 0,
  issued_date date not null default current_date,
  due_date date,
  sent_at timestamptz,
  sent_to_email text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Guards against accidentally billing the same family twice for the same
-- week — a voided invoice doesn't count, so re-drafting after voiding is
-- still allowed.
create unique index if not exists idx_invoices_bill_payer_week_active
  on invoices(bill_payer_id, week_start_date)
  where status <> 'void';

create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_bill_payer on invoices(bill_payer_id);

drop trigger if exists trg_invoices_updated on invoices;
create trigger trg_invoices_updated before update on invoices
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- invoice_line_items — one row per child on an invoice, snapshotting their
-- name/room/fee numbers as they were at draft time (child_id is kept for
-- reference but set null if the child record is ever deleted, rather than
-- deleting billing history).
-- ---------------------------------------------------------------------------

create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  child_id uuid references children(id) on delete set null,
  child_name text not null,
  room_name text,
  fee_total numeric(10,2) not null default 0,
  winz_payment numeric(10,2) not null default 0,
  parent_pays numeric(10,2) not null default 0,
  is_estimated boolean not null default false
);

create index if not exists idx_invoice_line_items_invoice on invoice_line_items(invoice_id);

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

drop policy if exists "invoices_all_authenticated" on invoices;
create policy "invoices_all_authenticated" on invoices
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "invoice_line_items_all_authenticated" on invoice_line_items;
create policy "invoice_line_items_all_authenticated" on invoice_line_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

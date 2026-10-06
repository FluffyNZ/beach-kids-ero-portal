-- Beach Kids ERO Self-Audit Portal
-- Migration 0043: Xero bank sync for parent fee invoices.
--
-- Adds a single-row table holding the portal's OAuth connection to your
-- Xero organisation (same "singleton row" pattern as fee_settings — the
-- app only ever talks to one Xero org), plus two columns on `invoices` so
-- a confirmed match to a real Xero bank transaction is remembered and
-- can't be matched to a second invoice by mistake.
--
-- Nothing here pulls data automatically — a sync only happens when you
-- click "Sync now" in the portal, and a payment is only marked against an
-- invoice after you confirm the match on screen. This migration does not
-- create any Xero connection by itself; that still needs you to click
-- "Connect to Xero" in the portal after this is run and your Xero
-- Developer App credentials are in place.
--
-- Run this in the Supabase SQL editor after 0001-0042, in order. Safe to
-- run more than once.

create table if not exists xero_connection (
  id boolean primary key default true,
  constraint xero_connection_singleton check (id),
  tenant_id text,
  tenant_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  bank_account_id text,
  bank_account_name text,
  connected_at timestamptz,
  connected_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_xero_connection_updated on xero_connection;
create trigger trg_xero_connection_updated before update on xero_connection
  for each row execute procedure set_updated_at();

alter table xero_connection enable row level security;

drop policy if exists "xero_connection_all_authenticated" on xero_connection;
create policy "xero_connection_all_authenticated" on xero_connection
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed the one singleton row up front (same reasoning as fee_settings),
-- so every later step can safely `update ... where id = true` instead of
-- needing to upsert/insert a row into existence on first connect.
insert into xero_connection (id) values (true) on conflict (id) do nothing;

-- A confirmed match to a real Xero bank transaction — set only once you
-- click "Confirm" on a proposed match, never automatically. The unique
-- index stops the same Xero transaction ever being matched to two
-- invoices by mistake.
alter table invoices add column if not exists xero_transaction_id text;
alter table invoices add column if not exists xero_matched_at timestamptz;

create unique index if not exists idx_invoices_xero_transaction_id
  on invoices(xero_transaction_id)
  where xero_transaction_id is not null;

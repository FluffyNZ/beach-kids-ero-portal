-- Beach Kids ERO Self-Audit Portal
-- Migration 0027: Stock Orders — a running order list per supplier
-- (Gilmours, Qizzle, Clean Boss) so items can be jotted down as they run
-- low through the week, then the whole list is worked through when it's
-- time to actually place the order. There's no integration with the
-- suppliers themselves (none of them expose an ordering API, and their
-- login details don't belong stored in this app) — placing the order is
-- still done by hand on each supplier's own site, or for Clean Boss, by
-- emailing them the list straight from here.
--
-- Run this in the Supabase SQL editor after 0001-0026, in order. Safe to
-- run more than once.

do $$ begin
  create type stock_supplier as enum ('gilmours', 'qizzle', 'clean_boss');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_order_item_status as enum ('pending', 'ordered');
exception when duplicate_object then null; end $$;

create table if not exists stock_order_items (
  id uuid primary key default gen_random_uuid(),
  supplier stock_supplier not null,
  item_name text not null,
  quantity numeric(8,2) not null default 1,
  unit text,
  notes text,
  status stock_order_item_status not null default 'pending',
  ordered_at timestamptz,
  ordered_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_stock_order_items_supplier_status
  on stock_order_items(supplier, status);
create index if not exists idx_stock_order_items_ordered_at
  on stock_order_items(ordered_at desc);

drop trigger if exists trg_stock_order_items_updated on stock_order_items;
create trigger trg_stock_order_items_updated before update on stock_order_items
  for each row execute procedure set_updated_at();

-- A single settings row — currently just the email address to send Clean
-- Boss orders to (left blank until you set it on the Stock Orders page,
-- rather than guessed).
create table if not exists stock_order_settings (
  id boolean primary key default true,
  clean_boss_email text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  constraint stock_order_settings_singleton check (id)
);

insert into stock_order_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists trg_stock_order_settings_updated on stock_order_settings;
create trigger trg_stock_order_settings_updated before update on stock_order_settings
  for each row execute procedure set_updated_at();

alter table stock_order_items enable row level security;
alter table stock_order_settings enable row level security;

drop policy if exists "stock_order_items_all_authenticated" on stock_order_items;
create policy "stock_order_items_all_authenticated" on stock_order_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "stock_order_settings_all_authenticated" on stock_order_settings;
create policy "stock_order_settings_all_authenticated" on stock_order_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

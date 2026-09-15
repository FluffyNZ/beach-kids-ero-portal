-- Beach Kids ERO Self-Audit Portal
-- Migration 0032: Hazard Checks — the Daily Hazard Checklist walked by
-- staff in each room, plus the Hazard Log embedded on that same paper
-- form. The Hazard Log doubles as the Hazard Register: a running list of
-- every identified hazard, its risk level, and whether it's been
-- resolved. An unresolved hazard log entry is what surfaces as a job on
-- the dashboard's Needs Attention list — a routine tick-box left
-- unchecked is not treated as a hazard on its own, since it usually just
-- means "not checked yet today".
--
-- Checklist items are seeded per room, exactly as they appear on Beach
-- Kids' real Daily Hazard Checklist forms. Tainui and Ohinemuri share the
-- fuller list (confirmed with Ethan, not assumed — both are the under-2s
-- rooms and use the same "Example" template shown on the paper form);
-- Pukewa's is its own, shorter list. "Float" has no physical room to
-- check, so it gets no template and never appears as an option.
--
-- Run this in the Supabase SQL editor after 0001-0031, in order. Safe to
-- run more than once.

do $$ begin
  create type hazard_check_category as enum ('indoor', 'outdoor', 'allergy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type hazard_risk_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- hazard_checklist_templates — the fixed list of items checked for a given
-- room. Copied (snapshotted) onto a hazard_check's items when it's created,
-- so editing a template later never rewrites history.
-- ---------------------------------------------------------------------------

create table if not exists hazard_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references roster_rooms(id) on delete cascade,
  category hazard_check_category not null,
  item_text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, category, item_text)
);

create index if not exists idx_hazard_templates_room on hazard_checklist_templates(room_id);

-- ---------------------------------------------------------------------------
-- hazard_checks — one row per room per day: the header of a completed (or
-- in-progress) Daily Hazard Checklist. Staff sign-off mirrors the real
-- form's "Name / Signature / Time" line. The unique constraint on
-- (room_id, check_date) is what stops the same day's check ever being
-- created twice for the same room.
-- ---------------------------------------------------------------------------

create table if not exists hazard_checks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references roster_rooms(id) on delete cascade,
  check_date date not null,
  notes text,
  staff_id uuid references staff(id) on delete set null,
  completed_time time,
  signed_off boolean not null default false,
  signed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique (room_id, check_date)
);

create index if not exists idx_hazard_checks_room on hazard_checks(room_id);
create index if not exists idx_hazard_checks_date on hazard_checks(check_date);

drop trigger if exists trg_hazard_checks_updated on hazard_checks;
create trigger trg_hazard_checks_updated before update on hazard_checks
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- hazard_check_items — a snapshot of each template item's ticked state for
-- one specific check.
-- ---------------------------------------------------------------------------

create table if not exists hazard_check_items (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references hazard_checks(id) on delete cascade,
  category hazard_check_category not null,
  item_text text not null,
  is_checked boolean not null default false,
  sort_order int not null default 0
);

create index if not exists idx_hazard_check_items_check on hazard_check_items(check_id);

-- ---------------------------------------------------------------------------
-- hazard_log_entries — the "Hazard & location / Risk / Resolved" rows on
-- the form. This table doubles as the Hazard Register: every identified
-- hazard across every check, filterable by risk and resolution status. An
-- unresolved entry is what creates a job on the dashboard.
-- ---------------------------------------------------------------------------

create table if not exists hazard_log_entries (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references hazard_checks(id) on delete cascade,
  hazard_description text not null,
  risk_level hazard_risk_level not null default 'low',
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hazard_log_check on hazard_log_entries(check_id);
create index if not exists idx_hazard_log_resolved on hazard_log_entries(resolved);
create index if not exists idx_hazard_log_risk on hazard_log_entries(risk_level);

drop trigger if exists trg_hazard_log_updated on hazard_log_entries;
create trigger trg_hazard_log_updated before update on hazard_log_entries
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — uniform with the rest of the app: any authenticated user.
-- ---------------------------------------------------------------------------

alter table hazard_checklist_templates enable row level security;
alter table hazard_checks enable row level security;
alter table hazard_check_items enable row level security;
alter table hazard_log_entries enable row level security;

drop policy if exists "authenticated_all_hazard_checklist_templates" on hazard_checklist_templates;
create policy "authenticated_all_hazard_checklist_templates" on hazard_checklist_templates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_hazard_checks" on hazard_checks;
create policy "authenticated_all_hazard_checks" on hazard_checks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_hazard_check_items" on hazard_check_items;
create policy "authenticated_all_hazard_check_items" on hazard_check_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_all_hazard_log_entries" on hazard_log_entries;
create policy "authenticated_all_hazard_log_entries" on hazard_log_entries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Seed: Daily Hazard Checklist items exactly as they appear on Beach Kids'
-- real forms. Tainui and Ohinemuri share the fuller "Example" list; Pukewa
-- keeps its own, separate list.
-- ---------------------------------------------------------------------------

insert into hazard_checklist_templates (room_id, category, item_text, sort_order)
select r.id, v.category::hazard_check_category, v.item_text, v.sort_order
from roster_rooms r
cross join (
  values
    ('indoor', 'Floors clear of spills, clutter, and trip hazards', 1),
    ('indoor', 'Furniture and shelving stable, safe and clean', 2),
    ('indoor', 'Toys/resources safe for toddlers, no choking hazards', 3),
    ('indoor', 'Electrical cords/appliances safe and out of reach', 4),
    ('indoor', 'Cleaning products/medicines locked away', 5),
    ('indoor', 'Kitchenette area restricted to staff', 6),
    ('indoor', 'Nappy change area hygienic, supplies stored safely', 7),
    ('indoor', 'Sleep area clear and safe (no loose cords, cots spaced)', 8),
    ('indoor', 'Emergency exits clear, no blockage.', 9),
    ('indoor', 'MCP have no obstructions, signage is current', 10),
    ('outdoor', 'Gates and fences secure', 1),
    ('outdoor', 'Surfaces safe, no pooling water or slippery hazards', 2),
    ('outdoor', 'Children play equipment in good repair', 3),
    ('outdoor', 'Sandpit clean, raked, and covered when not in use', 4),
    ('outdoor', 'Shade structures secure', 5),
    ('outdoor', 'Area clear of rubbish, broken glass, or animal droppings', 6),
    ('outdoor', 'No poisonous plants/berries', 7),
    ('outdoor', 'Buckets, troughs, pools emptied and stored safely', 8),
    ('outdoor', 'Outdoor storage locked', 9),
    ('allergy', 'Allergen notices current', 1),
    ('allergy', 'Lunchboxes and bottles stored safely off the floor', 2)
) as v(category, item_text, sort_order)
where r.name in ('Tainui', 'Ohinemuri')
on conflict (room_id, category, item_text) do nothing;

insert into hazard_checklist_templates (room_id, category, item_text, sort_order)
select r.id, v.category::hazard_check_category, v.item_text, v.sort_order
from roster_rooms r
cross join (
  values
    ('indoor', 'Floors clear of spills, clutter, and trip hazards', 1),
    ('indoor', 'Furniture and shelving stable, safe and clean', 2),
    ('indoor', 'Toys/resources safe for children, no choking hazards', 3),
    ('indoor', 'Electrical cords/appliances safe and out of reach', 4),
    ('indoor', 'Cleaning products/medicines locked away', 5),
    ('indoor', 'Kitchenette area clear of hazards.', 6),
    ('indoor', 'Children toilets area hygienic, supplies stored safely', 7),
    ('indoor', 'Emergency exits clear', 8),
    ('outdoor', 'Gates and fences secure', 1),
    ('outdoor', 'Surfaces safe, no pooling water or slippery hazards', 2),
    ('outdoor', 'Children play equipment in good repair', 3),
    ('outdoor', 'Sandpit clean, raked, and covered when not in use (Twice Daily)', 4),
    ('outdoor', 'Shade structures secure', 5),
    ('outdoor', 'Area clear of rubbish, broken glass, or animal droppings', 6),
    ('outdoor', 'No poisonous plants/berries', 7),
    ('outdoor', 'Buckets, troughs, pools emptied and stored safely', 8),
    ('outdoor', 'Outdoor storage locked', 9),
    ('allergy', 'Allergen notices current', 1),
    ('allergy', 'Lunchboxes and bottles stored safely off the floor', 2)
) as v(category, item_text, sort_order)
where r.name = 'Pukewa'
on conflict (room_id, category, item_text) do nothing;

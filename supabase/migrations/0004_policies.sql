-- Beach Kids ERO Self-Audit Portal
-- Migration 0004: Policies register
--
-- A dedicated area for Beach Kids' own governance/operating policies —
-- distinct from the Evidence Library (which holds compliance evidence
-- linked to specific ERO criteria). Each policy can have multiple
-- versions over time; a version is a draft until an manager approves it,
-- at which point it becomes the policy's current (live) version.
--
-- Run this in the Supabase SQL editor after 0001-0003, in order.

do $$ begin
  create type policy_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_version_status as enum ('draft', 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type policy_review_cycle as enum ('annual', 'biannual', 'three_yearly');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- policies — one row per named policy (e.g. "Health & Safety Policy").
-- current_version_id points at the latest APPROVED version; it is added
-- via alter table below once policy_versions exists (the two tables
-- reference each other).
-- ---------------------------------------------------------------------------

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  status policy_status not null default 'active',
  review_cycle policy_review_cycle,
  next_review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- policy_versions — every uploaded version of a policy document, kept
-- indefinitely for history even after a newer version is approved.
-- ---------------------------------------------------------------------------

create table if not exists policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references policies(id) on delete cascade,
  version_number integer not null,
  storage_path text not null unique,      -- path within the private 'policies' bucket
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint,
  change_summary text,
  status policy_version_status not null default 'draft',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  unique (policy_id, version_number)
);

create index if not exists idx_policy_versions_policy on policy_versions(policy_id);

alter table policies add column if not exists current_version_id uuid references policy_versions(id) on delete set null;
create index if not exists idx_policies_category on policies(category);
create index if not exists idx_policies_review on policies(next_review_date);

drop trigger if exists trg_policies_updated on policies;
create trigger trg_policies_updated before update on policies
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — same "any authenticated user may read/write" shape
-- as the rest of this single-organisation app (see 0002_rls.sql).
-- ---------------------------------------------------------------------------

alter table policies enable row level security;
alter table policy_versions enable row level security;

drop policy if exists "policies_all_authenticated" on policies;
create policy "policies_all_authenticated" on policies
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "policy_versions_all_authenticated" on policy_versions;
create policy "policy_versions_all_authenticated" on policy_versions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Private storage bucket for policy documents — same private + signed-URL
-- pattern as the 'evidence' bucket.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'policies',
  'policies',
  false,
  52428800, -- 50MB per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ]
)
on conflict (id) do nothing;

drop policy if exists "policies_bucket_select_authenticated" on storage.objects;
create policy "policies_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'policies' and auth.role() = 'authenticated');

drop policy if exists "policies_bucket_insert_authenticated" on storage.objects;
create policy "policies_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'policies' and auth.role() = 'authenticated');

drop policy if exists "policies_bucket_update_authenticated" on storage.objects;
create policy "policies_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'policies' and auth.role() = 'authenticated');

drop policy if exists "policies_bucket_delete_authenticated" on storage.objects;
create policy "policies_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'policies' and auth.role() = 'authenticated');

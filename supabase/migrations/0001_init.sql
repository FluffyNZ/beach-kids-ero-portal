-- Beach Kids ERO Self-Audit Portal
-- Migration 0001: core schema
-- Run in the Supabase SQL editor, or via `supabase db push`, in order.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type compliance_status as enum ('not_assessed', 'yes', 'no', 'unsure', 'na');
exception when duplicate_object then null; end $$;

do $$ begin
  create type evidence_status as enum ('missing', 'partial', 'ready', 'not_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type action_priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type action_status as enum ('open', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('admin', 'manager');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per authorised login, mirrors auth.users.
-- v1 ships with a single authorised account; the table is designed so more
-- management accounts can be added later without a schema change.
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role app_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created, so the
-- Supabase Auth user list stays the single source of truth for logins.
create or replace function handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- ERO structure — sections and criteria.
-- ero_sections is seeded with the four fixed ERO categories (0003).
-- ero_criteria must be populated verbatim from the official ERO Self-Audit
-- Checklists document (2008 regulatory framework, Jan 2022). Nothing here is
-- invented, simplified, merged or reworded — see supabase/seed/README.md.
-- ---------------------------------------------------------------------------

create table if not exists ero_sections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,              -- 'C' | 'PF' | 'HS' | 'GMA'
  name text not null,                     -- e.g. 'Curriculum'
  description text,
  sort_order integer not null default 0
);

create table if not exists ero_criteria (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references ero_sections(id) on delete restrict,
  code text not null unique,              -- e.g. 'HS7'
  title text not null,                    -- short heading, e.g. 'Emergency Planning'
  official_requirement text not null,     -- verbatim ERO requirement/question text
  source_reference text,                  -- page/clause reference in the source document
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ero_criteria_section on ero_criteria(section_id);

-- ---------------------------------------------------------------------------
-- Beach Kids internal readiness checklist — our own sub-items per criterion,
-- with their own tick boxes. Empty until management adds items.
-- ---------------------------------------------------------------------------

create table if not exists beachkids_checklist_items (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null references ero_criteria(id) on delete cascade,
  description text not null,
  sort_order integer not null default 0,
  is_checked boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checklist_items_criterion on beachkids_checklist_items(criterion_id);

-- ---------------------------------------------------------------------------
-- Criterion assessments — one row per criterion holding the current
-- compliance/evidence status, management notes and review info.
-- No row = "Not Assessed" / evidence "Missing" (the app treats a missing
-- row as those defaults so nothing has to be pre-seeded per criterion).
-- ---------------------------------------------------------------------------

create table if not exists criterion_assessments (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null unique references ero_criteria(id) on delete cascade,
  compliance_status compliance_status not null default 'not_assessed',
  evidence_status evidence_status not null default 'missing',
  management_notes text,
  last_reviewed_at date,
  next_review_date date,
  reviewed_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- Evidence Library — uploaded once, linked to many criteria.
-- ---------------------------------------------------------------------------

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_filename text not null,
  storage_path text not null unique,      -- path within the private 'evidence' bucket
  mime_type text,
  file_size_bytes bigint,
  description text,
  category text,                          -- e.g. 'First Aid', 'Police Vet', 'Policy', 'Fire'
  document_date date,                     -- date the document itself is dated/effective
  review_date date,                       -- optional internal review checkpoint
  expiry_date date,                       -- optional hard expiry (certificates, WOF, etc.)
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_evidence_category on evidence(category);
create index if not exists idx_evidence_expiry on evidence(expiry_date);
create index if not exists idx_evidence_review on evidence(review_date);

-- Full text search across the fields the brief calls out (title, category,
-- description, filename) so "Emergency", "HS7", "Police Vet" etc. all work.
alter table evidence add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(original_filename, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'C')
  ) stored;

create index if not exists idx_evidence_search on evidence using gin(search_vector);

-- ---------------------------------------------------------------------------
-- Evidence <-> Criteria links (many-to-many). Unlinking removes the join
-- row only — never the underlying evidence record or file.
-- ---------------------------------------------------------------------------

create table if not exists evidence_criteria_links (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references evidence(id) on delete cascade,
  criterion_id uuid not null references ero_criteria(id) on delete cascade,
  linked_at timestamptz not null default now(),
  linked_by uuid references profiles(id),
  unique (evidence_id, criterion_id)
);

create index if not exists idx_links_evidence on evidence_criteria_links(evidence_id);
create index if not exists idx_links_criterion on evidence_criteria_links(criterion_id);

-- ---------------------------------------------------------------------------
-- Actions Required — created against a criterion, surfaced centrally.
-- ---------------------------------------------------------------------------

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null references ero_criteria(id) on delete cascade,
  description text not null,
  responsible_person text not null,
  due_date date,
  priority action_priority not null default 'medium',
  status action_status not null default 'open',
  completion_date date,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_actions_criterion on actions(criterion_id);
create index if not exists idx_actions_status on actions(status);
create index if not exists idx_actions_due on actions(due_date);

-- ---------------------------------------------------------------------------
-- Activity log — audit trail powering "last reviewed" and future history
-- views. Append-only from the application's point of view.
-- ---------------------------------------------------------------------------

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid references ero_criteria(id) on delete set null,
  entity_type text not null,              -- 'criterion' | 'evidence' | 'action' | 'checklist_item'
  entity_id uuid,
  event_type text not null,               -- e.g. 'status_changed', 'evidence_uploaded', 'action_completed'
  description text not null,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_criterion on activity_log(criterion_id);
create index if not exists idx_activity_created on activity_log(created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute procedure set_updated_at();

drop trigger if exists trg_checklist_items_updated on beachkids_checklist_items;
create trigger trg_checklist_items_updated before update on beachkids_checklist_items
  for each row execute procedure set_updated_at();

drop trigger if exists trg_assessments_updated on criterion_assessments;
create trigger trg_assessments_updated before update on criterion_assessments
  for each row execute procedure set_updated_at();

drop trigger if exists trg_evidence_updated on evidence;
create trigger trg_evidence_updated before update on evidence
  for each row execute procedure set_updated_at();

drop trigger if exists trg_actions_updated on actions;
create trigger trg_actions_updated before update on actions
  for each row execute procedure set_updated_at();

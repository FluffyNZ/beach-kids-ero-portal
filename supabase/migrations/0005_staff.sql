-- Beach Kids ERO Self-Audit Portal
-- Migration 0005: Staff directory, per-person files, and the
-- qualifications / pay parity tracker.
--
-- A dedicated area distinct from the Evidence Library and Policies:
-- one row per staff member, with a flat list of their own documents
-- (contract, ID, police vet, first aid cert, qualification certs, visa /
-- work entitlement, etc.) and a single qualifications/pay-parity snapshot
-- per person. Unlike Policies, staff documents are NOT version-controlled
-- with an approval workflow — most of these documents (a police vet,
-- first aid cert) are periodically renewed rather than revised, so each
-- upload is simply a new document in that person's list, optionally with
-- an expiry date for renewal tracking (reusing the existing
-- getDeadlineAlert helper already used for Evidence and Policies).
--
-- Run this in the Supabase SQL editor after 0001-0004, in order.
--
-- IMPORTANT: this migration creates no staff records or documents. Do not
-- seed fake staff, and only ever add real staff members and their real
-- documents.

do $$ begin
  create type staff_status as enum ('active', 'former');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_document_category as enum (
    'contract',
    'identification',
    'police_vet',
    'first_aid',
    'qualification',
    'visa_work_entitlement',
    'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- staff — the directory. One row per staff member (real people only).
-- ---------------------------------------------------------------------------

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  start_date date,
  end_date date,
  status staff_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_staff_status on staff(status);

drop trigger if exists trg_staff_updated on staff;
create trigger trg_staff_updated before update on staff
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- staff_documents — every file uploaded for a staff member: contract, ID,
-- police vet, first aid cert, qualification cert, visa / work entitlement,
-- etc. Flat list (not versioned) — a renewed cert is simply a new row;
-- history is kept by leaving older uploads in place.
-- ---------------------------------------------------------------------------

create table if not exists staff_documents (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  category staff_document_category not null default 'other',
  storage_path text not null unique,      -- path within the private 'staff-documents' bucket
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint,
  expiry_date date,                       -- for renewal-based docs (police vet, first aid, visa, etc.)
  notes text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_staff_documents_staff on staff_documents(staff_id);
create index if not exists idx_staff_documents_expiry on staff_documents(expiry_date);

-- ---------------------------------------------------------------------------
-- staff_qualifications — one snapshot row per staff member: qualification
-- level, registration status, current pay parity step, next review date,
-- plus optional "currently studying towards" tracking for upcoming pay
-- step changes.
-- ---------------------------------------------------------------------------

create table if not exists staff_qualifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null unique references staff(id) on delete cascade,
  qualification_level text,
  registration_status text,
  pay_parity_step text,
  next_review_date date,
  is_studying boolean not null default false,
  studying_qualification text,
  expected_completion_date date,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

drop trigger if exists trg_staff_qualifications_updated on staff_qualifications;
create trigger trg_staff_qualifications_updated before update on staff_qualifications
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — same "any authenticated user may read/write" shape
-- as the rest of this single-organisation app (see 0002_rls.sql).
-- ---------------------------------------------------------------------------

alter table staff enable row level security;
alter table staff_documents enable row level security;
alter table staff_qualifications enable row level security;

drop policy if exists "staff_all_authenticated" on staff;
create policy "staff_all_authenticated" on staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff_documents_all_authenticated" on staff_documents;
create policy "staff_documents_all_authenticated" on staff_documents
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff_qualifications_all_authenticated" on staff_qualifications;
create policy "staff_qualifications_all_authenticated" on staff_qualifications
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Private storage bucket for staff documents — same private + signed-URL
-- pattern as the 'evidence' and 'policies' buckets.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-documents',
  'staff-documents',
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

drop policy if exists "staff_documents_bucket_select_authenticated" on storage.objects;
create policy "staff_documents_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'staff-documents' and auth.role() = 'authenticated');

drop policy if exists "staff_documents_bucket_insert_authenticated" on storage.objects;
create policy "staff_documents_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'staff-documents' and auth.role() = 'authenticated');

drop policy if exists "staff_documents_bucket_update_authenticated" on storage.objects;
create policy "staff_documents_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'staff-documents' and auth.role() = 'authenticated');

drop policy if exists "staff_documents_bucket_delete_authenticated" on storage.objects;
create policy "staff_documents_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'staff-documents' and auth.role() = 'authenticated');

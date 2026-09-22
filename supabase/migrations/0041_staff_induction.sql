-- Beach Kids ERO Self-Audit Portal
-- Migration 0041: Digital Staff Induction — the real "Induction Pack for
-- Kaiako" PDF, turned into a checklist that lives on each staff member's
-- profile, with a typed/drawn signature at the end instead of a paper sign-off.
--
-- The actual checklist items (every policy, every room's hazard tick-boxes,
-- every form acknowledgement) are NOT stored in the database — they live in
-- code, in src/lib/staff-induction-checklist.ts, exactly like the required
-- document categories already do. This table only stores which of those
-- item keys a given staff member has ticked (item_states), plus the two
-- sign-off blocks the pack ends with (kaiako signature, and a manager/
-- overseer sign-off). Storing progress as jsonb rather than one row per
-- item means adding or rewording a checklist item later never needs a
-- migration.
--
-- Run this in the Supabase SQL editor after 0001-0040, in order. Safe to
-- run more than once.

create table if not exists staff_inductions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null unique references staff(id) on delete cascade,
  -- { "<item key>": true, ... } — an absent key means unticked. Ticking
  -- doesn't record who/when at the item level (the pack itself doesn't
  -- either — only the two signature blocks below do).
  item_states jsonb not null default '{}'::jsonb,
  staff_signature_name text,
  staff_signature_storage_path text,
  staff_signed_at timestamptz,
  manager_signature_name text,
  manager_signature_storage_path text,
  manager_signed_at timestamptz,
  -- Set once every current checklist item is ticked AND the staff member
  -- has signed. Recomputed on every save rather than trusted as a manual
  -- flag, so it can never drift out of sync with the actual tick states.
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_staff_inductions_staff on staff_inductions(staff_id);

drop trigger if exists trg_staff_inductions_updated on staff_inductions;
create trigger trg_staff_inductions_updated before update on staff_inductions
  for each row execute procedure set_updated_at();

alter table staff_inductions enable row level security;

drop policy if exists "authenticated_all_staff_inductions" on staff_inductions;
create policy "authenticated_all_staff_inductions" on staff_inductions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Storage — drawn signatures (a small PNG from the on-screen signature pad).
-- Private bucket, signed URLs only, same pattern as staff-photos.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-induction-signatures',
  'staff-induction-signatures',
  false,
  2097152, -- 2MB per file — plenty for a drawn signature PNG
  array['image/png']
)
on conflict (id) do nothing;

drop policy if exists "staff_induction_signatures_select_authenticated" on storage.objects;
create policy "staff_induction_signatures_select_authenticated" on storage.objects
  for select using (bucket_id = 'staff-induction-signatures' and auth.role() = 'authenticated');

drop policy if exists "staff_induction_signatures_insert_authenticated" on storage.objects;
create policy "staff_induction_signatures_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'staff-induction-signatures' and auth.role() = 'authenticated');

drop policy if exists "staff_induction_signatures_update_authenticated" on storage.objects;
create policy "staff_induction_signatures_update_authenticated" on storage.objects
  for update using (bucket_id = 'staff-induction-signatures' and auth.role() = 'authenticated');

drop policy if exists "staff_induction_signatures_delete_authenticated" on storage.objects;
create policy "staff_induction_signatures_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'staff-induction-signatures' and auth.role() = 'authenticated');

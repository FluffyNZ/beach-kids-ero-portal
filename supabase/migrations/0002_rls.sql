-- Beach Kids ERO Self-Audit Portal
-- Migration 0002: Row Level Security + private storage
--
-- This is a private, single-organisation management system: there is no
-- public-facing data at all. The policy shape is deliberately simple —
-- "any authenticated (logged-in) user may read/write" — because every
-- logged-in user is, by design, an authorised Beach Kids manager (v1 has
-- exactly one such login; more can be added later via Supabase Auth without
-- any policy changes). Anonymous (anon) access is denied everywhere.

alter table profiles enable row level security;
alter table ero_sections enable row level security;
alter table ero_criteria enable row level security;
alter table beachkids_checklist_items enable row level security;
alter table criterion_assessments enable row level security;
alter table evidence enable row level security;
alter table evidence_criteria_links enable row level security;
alter table actions enable row level security;
alter table activity_log enable row level security;

-- profiles: a user can see all profiles (small management team) but only
-- update their own row.
drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Reference/audit data: read for any authenticated user, write restricted
-- to the server (service role) which populates it from the source document.
drop policy if exists "sections_select_authenticated" on ero_sections;
create policy "sections_select_authenticated" on ero_sections
  for select using (auth.role() = 'authenticated');

drop policy if exists "criteria_select_authenticated" on ero_criteria;
create policy "criteria_select_authenticated" on ero_criteria
  for select using (auth.role() = 'authenticated');

-- Everything else: full CRUD for any authenticated user.
drop policy if exists "checklist_items_all_authenticated" on beachkids_checklist_items;
create policy "checklist_items_all_authenticated" on beachkids_checklist_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "assessments_all_authenticated" on criterion_assessments;
create policy "assessments_all_authenticated" on criterion_assessments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "evidence_all_authenticated" on evidence;
create policy "evidence_all_authenticated" on evidence
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "links_all_authenticated" on evidence_criteria_links;
create policy "links_all_authenticated" on evidence_criteria_links
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "actions_all_authenticated" on actions;
create policy "actions_all_authenticated" on actions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "activity_select_authenticated" on activity_log;
create policy "activity_select_authenticated" on activity_log
  for select using (auth.role() = 'authenticated');

drop policy if exists "activity_insert_authenticated" on activity_log;
create policy "activity_insert_authenticated" on activity_log
  for insert with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Private storage bucket for evidence documents.
-- public = false: objects are never reachable by a bare URL. All access
-- goes through short-lived signed URLs minted server-side after checking
-- the caller's session (see src/lib/data/evidence.ts).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800, -- 50MB per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/heic'
  ]
)
on conflict (id) do nothing;

drop policy if exists "evidence_bucket_select_authenticated" on storage.objects;
create policy "evidence_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'evidence' and auth.role() = 'authenticated');

drop policy if exists "evidence_bucket_insert_authenticated" on storage.objects;
create policy "evidence_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'evidence' and auth.role() = 'authenticated');

drop policy if exists "evidence_bucket_update_authenticated" on storage.objects;
create policy "evidence_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'evidence' and auth.role() = 'authenticated');

drop policy if exists "evidence_bucket_delete_authenticated" on storage.objects;
create policy "evidence_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'evidence' and auth.role() = 'authenticated');

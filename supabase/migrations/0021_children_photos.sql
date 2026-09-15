-- Beach Kids ERO Self-Audit Portal
-- Migration 0021: Child profile photos.
--
-- One optional photo per child, stored in a private bucket (same private +
-- signed-URL pattern as staff-documents, policies and evidence) rather than
-- a public one — these are photos of real children, so they shouldn't be
-- reachable by a guessed/shared URL.
--
-- Run this in the Supabase SQL editor after 0019 and 0020, in order. Safe
-- to run more than once.

alter table children add column if not exists photo_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child-photos',
  'child-photos',
  false,
  10485760, -- 10MB per file
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "child_photos_bucket_select_authenticated" on storage.objects;
create policy "child_photos_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'child-photos' and auth.role() = 'authenticated');

drop policy if exists "child_photos_bucket_insert_authenticated" on storage.objects;
create policy "child_photos_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'child-photos' and auth.role() = 'authenticated');

drop policy if exists "child_photos_bucket_update_authenticated" on storage.objects;
create policy "child_photos_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'child-photos' and auth.role() = 'authenticated');

drop policy if exists "child_photos_bucket_delete_authenticated" on storage.objects;
create policy "child_photos_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'child-photos' and auth.role() = 'authenticated');

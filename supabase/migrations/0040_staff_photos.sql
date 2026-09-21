-- Beach Kids ERO Self-Audit Portal
-- Migration 0040: Staff profile photos.
--
-- Same pattern as 0021 (child profile photos): one optional photo per
-- staff member, stored in a private bucket with signed URLs rather than a
-- public one — these are photos of real people, so they shouldn't be
-- reachable by a guessed/shared URL. This is what lets the Centre
-- Calendar show a real photo on a staff member's birthday instead of just
-- a coloured dot.
--
-- Run this in the Supabase SQL editor after 0039_staff_leave_backfill.sql.
-- Safe to run more than once.

alter table staff add column if not exists photo_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-photos',
  'staff-photos',
  false,
  10485760, -- 10MB per file
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "staff_photos_bucket_select_authenticated" on storage.objects;
create policy "staff_photos_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'staff-photos' and auth.role() = 'authenticated');

drop policy if exists "staff_photos_bucket_insert_authenticated" on storage.objects;
create policy "staff_photos_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'staff-photos' and auth.role() = 'authenticated');

drop policy if exists "staff_photos_bucket_update_authenticated" on storage.objects;
create policy "staff_photos_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'staff-photos' and auth.role() = 'authenticated');

drop policy if exists "staff_photos_bucket_delete_authenticated" on storage.objects;
create policy "staff_photos_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'staff-photos' and auth.role() = 'authenticated');

-- Beach Kids ERO Self-Audit Portal
-- Migration 0030: Learning Stories — a new module inside the existing
-- website, built the same way every other module here is: reusing the
-- existing `children` and `staff` tables (no duplicate profiles), the same
-- single-tier "any authenticated user" RLS, and the same storage-bucket +
-- signed-URL pattern already used for evidence/policies/staff documents.
--
-- Scope for this migration: Learning Stories only. Planning, child notes,
-- routines, community posts, messaging, attendance and enrolment are
-- deliberately NOT part of this — they're separate future modules.
--
-- Family/parent access is NOT built yet, but the shape below is chosen so
-- that doesn't require restructuring later:
--   - `learning_stories.status` already distinguishes published from
--     everything else, so a future "families only see published stories"
--     rule is a single, simple filter.
--   - `learning_story_children` is a proper join table, so per-child,
--     per-family visibility can be built directly on top of it without
--     touching the story or media tables.
--   - `learning_story_media` and `learning_story_tags` are already
--     separate, story-scoped tables rather than columns, so "let a family
--     see the media/tags for a story" is additive, not a rebuild.
--   - Nothing here creates parent logins or family-facing tables yet —
--     that's future work, deliberately deferred.
--
-- Run this in the Supabase SQL editor after 0001-0029, in order. Safe to
-- run more than once.

do $$ begin
  create type learning_story_status as enum (
    'draft',
    'awaiting_approval',
    'returned_for_editing',
    'published',
    'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type learning_story_media_kind as enum ('image', 'video', 'pdf');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Learning tag sets & tags — Te Whāriki is seeded below (the 5 top-level
-- strands only; specific goals underneath them are left for you to add
-- later rather than guessed at here). The structure supports additional
-- sets later (Beach Kids Values, Learning Dispositions, Interests, Te Reo
-- Māori, School Readiness) without any schema change — just new rows.
-- ---------------------------------------------------------------------------

create table if not exists learning_tag_sets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists learning_tags (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references learning_tag_sets(id) on delete cascade,
  -- null = a top-level tag (e.g. a Te Whāriki strand). Set = a goal/outcome
  -- sitting underneath a strand, once you add those.
  parent_tag_id uuid references learning_tags(id) on delete cascade,
  name text not null,
  maori_name text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_tags_set on learning_tags(set_id);
create index if not exists idx_learning_tags_parent on learning_tags(parent_tag_id);

insert into learning_tag_sets (key, name, sort_order)
values ('te_whariki', 'Te Whāriki', 1)
on conflict (key) do nothing;

insert into learning_tags (set_id, name, maori_name, sort_order)
select s.id, v.name, v.maori_name, v.sort_order
from (values
  ('Wellbeing', 'Mana Atua', 1),
  ('Belonging', 'Mana Whenua', 2),
  ('Contribution', 'Mana Tangata', 3),
  ('Communication', 'Mana Reo', 4),
  ('Exploration', 'Mana Aotūroa', 5)
) as v(name, maori_name, sort_order)
cross join (select id from learning_tag_sets where key = 'te_whariki') as s
where not exists (
  select 1 from learning_tags t
  where t.set_id = s.id and t.name = v.name and t.parent_tag_id is null
);

-- ---------------------------------------------------------------------------
-- Learning stories — one row per story. `content_blocks` holds the
-- flexible, visual layout (headings, text, images, image pairs, video,
-- PDF) as an ordered JSON array; the actual uploaded files live in
-- `learning_story_media` below and are referenced from these blocks by id,
-- so managing media (reorder/caption/remove) never means rewriting layout.
-- ---------------------------------------------------------------------------

create table if not exists learning_stories (
  id uuid primary key default gen_random_uuid(),
  story_number text not null unique, -- app-generated, e.g. LS-0001
  title text not null default '',
  story_date date not null default current_date,
  author_staff_id uuid references staff(id) on delete set null,
  status learning_story_status not null default 'draft',
  content_blocks jsonb not null default '[]'::jsonb,
  -- Snapshot of the author's publish permission at the moment they
  -- submitted/published — so a later change to that setting doesn't
  -- rewrite the history of what actually happened to this story.
  requires_approval boolean not null default false,
  review_comments text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  submitted_by uuid references profiles(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  last_autosaved_at timestamptz
);

create index if not exists idx_learning_stories_status on learning_stories(status);
create index if not exists idx_learning_stories_date on learning_stories(story_date desc);
create index if not exists idx_learning_stories_author on learning_stories(author_staff_id);

drop trigger if exists trg_learning_stories_updated on learning_stories;
create trigger trg_learning_stories_updated before update on learning_stories
  for each row execute procedure set_updated_at();

-- One story can involve multiple children (a Group Learning Story) without
-- duplicating the story itself — this is the join table that makes that
-- work, and what a per-child timeline is built from.
create table if not exists learning_story_children (
  story_id uuid not null references learning_stories(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  primary key (story_id, child_id)
);

create index if not exists idx_learning_story_children_child on learning_story_children(child_id);

create table if not exists learning_story_tags (
  story_id uuid not null references learning_stories(id) on delete cascade,
  tag_id uuid not null references learning_tags(id) on delete cascade,
  primary key (story_id, tag_id)
);

create index if not exists idx_learning_story_tags_tag on learning_story_tags(tag_id);

create table if not exists learning_story_media (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references learning_stories(id) on delete cascade,
  storage_path text not null unique, -- path within the private 'learning-story-media' bucket
  original_filename text not null,
  mime_type text,
  file_size_bytes bigint,
  kind learning_story_media_kind not null,
  caption text,
  sort_order int not null default 0,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_learning_story_media_story on learning_story_media(story_id);

-- A simple, explicit audit trail — kept separate from the story row itself
-- so it can be shown to management without cluttering the editor teachers
-- actually write in day to day.
create table if not exists learning_story_status_history (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references learning_stories(id) on delete cascade,
  from_status learning_story_status,
  to_status learning_story_status not null,
  comment text,
  changed_by uuid references profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_learning_story_status_history_story on learning_story_status_history(story_id);

-- ---------------------------------------------------------------------------
-- Per-educator publish permission. This is deliberately on `staff` (the
-- real-people directory), not `profiles` (logins) — Beach Kids currently
-- runs on a single shared login, so this can't yet be enforced as real
-- per-account access control. It drives which button the editor shows
-- ("Publish" vs "Submit for Approval") and is honest about being a
-- workflow setting today, not a security boundary.
-- ---------------------------------------------------------------------------

alter table staff add column if not exists can_publish_learning_stories boolean not null default false;

-- ---------------------------------------------------------------------------
-- Row Level Security — same "any authenticated user may read/write" shape
-- as the rest of this single-organisation app (see 0002_rls.sql).
-- ---------------------------------------------------------------------------

alter table learning_tag_sets enable row level security;
alter table learning_tags enable row level security;
alter table learning_stories enable row level security;
alter table learning_story_children enable row level security;
alter table learning_story_tags enable row level security;
alter table learning_story_media enable row level security;
alter table learning_story_status_history enable row level security;

drop policy if exists "learning_tag_sets_all_authenticated" on learning_tag_sets;
create policy "learning_tag_sets_all_authenticated" on learning_tag_sets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "learning_tags_all_authenticated" on learning_tags;
create policy "learning_tags_all_authenticated" on learning_tags
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "learning_stories_all_authenticated" on learning_stories;
create policy "learning_stories_all_authenticated" on learning_stories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "learning_story_children_all_authenticated" on learning_story_children;
create policy "learning_story_children_all_authenticated" on learning_story_children
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "learning_story_tags_all_authenticated" on learning_story_tags;
create policy "learning_story_tags_all_authenticated" on learning_story_tags
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "learning_story_media_all_authenticated" on learning_story_media;
create policy "learning_story_media_all_authenticated" on learning_story_media
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "learning_story_status_history_all_authenticated" on learning_story_status_history;
create policy "learning_story_status_history_all_authenticated" on learning_story_status_history
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Private storage bucket for learning story media — same private +
-- signed-URL pattern as 'staff-documents' / 'policies', just with images,
-- video and PDF allowed and a larger size limit for video.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-story-media',
  'learning-story-media',
  false,
  209715200, -- 200MB per file (video is the reason for the higher limit)
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

drop policy if exists "learning_story_media_bucket_select_authenticated" on storage.objects;
create policy "learning_story_media_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'learning-story-media' and auth.role() = 'authenticated');

drop policy if exists "learning_story_media_bucket_insert_authenticated" on storage.objects;
create policy "learning_story_media_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'learning-story-media' and auth.role() = 'authenticated');

drop policy if exists "learning_story_media_bucket_update_authenticated" on storage.objects;
create policy "learning_story_media_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'learning-story-media' and auth.role() = 'authenticated');

drop policy if exists "learning_story_media_bucket_delete_authenticated" on storage.objects;
create policy "learning_story_media_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'learning-story-media' and auth.role() = 'authenticated');

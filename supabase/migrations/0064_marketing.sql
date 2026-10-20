-- Beach Kids ERO Self-Audit Portal
-- Migration 0064: Marketing module — posts, media, per-platform publish
-- tracking, Meta (Facebook/Instagram) connections, settings, and a real
-- (previously non-existent) per-child marketing-photo-consent flag.
--
-- Run this in the Supabase SQL editor after 0063_staff_tax_code.sql. Safe
-- to run more than once.

-- ---------------------------------------------------------------------------
-- children: a REAL consent flag for using a child's photo in centre
-- marketing / social media posts. This app had no photo-consent data model
-- at all before this (see ChildHealthPanel's own note) — this is not a
-- stand-in for sunscreen consent, enrolment consent, or anything else, and
-- it starts unset (null = "not yet confirmed with the family") for every
-- child. Nothing elsewhere in the app sets this automatically, and
-- uploading a child's profile photo (child-photo-upload.tsx) never implies
-- marketing consent — this is a separate, explicit flag a staff member
-- ticks only after actually checking with the family.
-- ---------------------------------------------------------------------------
alter table children add column if not exists marketing_photo_consent boolean;
alter table children add column if not exists marketing_photo_consent_notes text;
alter table children add column if not exists marketing_photo_consent_updated_at timestamptz;
alter table children add column if not exists marketing_photo_consent_updated_by uuid references profiles(id);

-- ---------------------------------------------------------------------------
-- marketing_settings — one singleton row. monthly_goal/weekly_goal drive the
-- Overview tab's posting-goal tracker; Christmas closure/reopening dates are
-- entered by Ethan himself (never guessed) and feed the closure/reopening
-- suggestion cards.
-- ---------------------------------------------------------------------------
create table if not exists marketing_settings (
  id text primary key default 'default',
  monthly_goal int not null default 1,
  weekly_goal_enabled boolean not null default false,
  weekly_goal int,
  christmas_closure_start date,
  christmas_reopening_date date,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

insert into marketing_settings (id) values ('default') on conflict (id) do nothing;

drop trigger if exists trg_marketing_settings_updated on marketing_settings;
create trigger trg_marketing_settings_updated before update on marketing_settings
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing_posts — one row per content item (a post may target Facebook,
-- Instagram, or both; posting to both still counts as ONE row / one content
-- item, per the brief). scheduled_at is a real timestamptz (UTC under the
-- hood), so Pacific/Auckland + daylight saving is just display-time
-- conversion in the app layer, never stored as a naive local time.
-- ---------------------------------------------------------------------------
create table if not exists marketing_posts (
  id uuid primary key default gen_random_uuid(),
  caption text not null default '',
  caption_facebook text, -- null = use `caption` as-is for Facebook
  caption_instagram text, -- null = use `caption` as-is for Instagram
  platforms text[] not null default array['facebook', 'instagram']::text[]
    check (platforms <@ array['facebook', 'instagram']::text[] and array_length(platforms, 1) > 0),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  -- Set when this draft was created from a suggestion card (e.g.
  -- 'public_holiday_waitangi_2027') so the Overview tab can hide a
  -- suggestion once it's already been turned into a draft, without a
  -- separate "dismissed" row. Never set for a from-scratch post.
  suggestion_key text,
  -- Must be explicitly ticked on the Create/Edit post screen before this
  -- post can be scheduled or published if any of its media is tagged with
  -- a child — see marketing_post_media_children below. Never defaults true.
  photo_permission_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_marketing_posts_status on marketing_posts(status);
create index if not exists idx_marketing_posts_scheduled_at on marketing_posts(scheduled_at);

drop trigger if exists trg_marketing_posts_updated on marketing_posts;
create trigger trg_marketing_posts_updated before update on marketing_posts
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing_post_media — photos/video attached to a post. Stored in the
-- public 'marketing-media' bucket (see below) because Meta's Graph API
-- fetches media by a public URL it calls out to directly; gating who gets
-- to actually publish is handled by photo_permission_reviewed and the
-- Connections/App-side checks, not by hiding the file.
-- ---------------------------------------------------------------------------
create table if not exists marketing_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references marketing_posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  file_size bigint,
  width int,
  height int,
  duration_seconds numeric,
  sort_order int not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_post_media_post on marketing_post_media(post_id);

-- ---------------------------------------------------------------------------
-- marketing_post_media_children — which real children are identifiable in a
-- given piece of media, and the actual permission-review outcome recorded
-- against that real child at review time. consent_source is a snapshot of
-- children.marketing_photo_consent as it stood when reviewed (so later
-- changing a child's consent flag doesn't silently rewrite history for a
-- post already reviewed/published).
-- ---------------------------------------------------------------------------
create table if not exists marketing_post_media_children (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references marketing_post_media(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  consent_confirmed boolean not null default false,
  consent_source text not null default 'unknown' check (consent_source in ('on_file', 'unknown', 'declined')),
  created_at timestamptz not null default now(),
  unique (media_id, child_id)
);

create index if not exists idx_marketing_post_media_children_media on marketing_post_media_children(media_id);

-- ---------------------------------------------------------------------------
-- marketing_post_platform_results — Facebook and Instagram are tracked
-- completely separately, as the brief requires: "if one platform succeeds
-- and the other fails, retry only the failed platform." One row per
-- platform a post targets, created when the post is scheduled/published.
-- ---------------------------------------------------------------------------
create table if not exists marketing_post_platform_results (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references marketing_posts(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  status text not null default 'pending'
    check (status in ('pending', 'publishing', 'published', 'failed', 'skipped')),
  external_post_id text,
  external_permalink text,
  error_message text,
  attempt_count int not null default 0,
  last_attempted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, platform)
);

create index if not exists idx_marketing_post_platform_results_post on marketing_post_platform_results(post_id);

drop trigger if exists trg_marketing_post_platform_results_updated on marketing_post_platform_results;
create trigger trg_marketing_post_platform_results_updated before update on marketing_post_platform_results
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing_dismissed_suggestions — a suggestion card Ethan explicitly
-- dismissed without turning it into a draft (e.g. "Meet the team" when he
-- doesn't want it this month), so the Overview tab doesn't keep re-showing
-- it. Turning a suggestion into a draft instead is tracked via
-- marketing_posts.suggestion_key above, not here.
-- ---------------------------------------------------------------------------
create table if not exists marketing_dismissed_suggestions (
  suggestion_key text primary key,
  dismissed_at timestamptz not null default now(),
  dismissed_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- marketing_connections — one row per platform connection. access_token is
-- stored encrypted (see src/lib/marketing/token-crypto.ts) and the data
-- layer never returns the decrypted value to any client component; this
-- table uses the same "any authenticated Beach Kids user" RLS shape as the
-- rest of the app (see 0002_rls.sql), with the token's own encryption as
-- the extra layer the brief asks for ("keep access tokens secure on the
-- server").
-- ---------------------------------------------------------------------------
create table if not exists marketing_connections (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('facebook_page', 'instagram_business')),
  external_account_id text,
  external_account_name text,
  access_token_encrypted text,
  token_expires_at timestamptz,
  long_lived_token_obtained_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'expired', 'error')),
  last_verified_at timestamptz,
  last_error text,
  connected_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_marketing_connections_updated on marketing_connections;
create trigger trg_marketing_connections_updated before update on marketing_connections
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing_oauth_pending — short-lived bridge between the Meta OAuth
-- redirect and the "pick which Page" step on the Connections page (a
-- Facebook login can return more than one Page). Rows expire quickly and
-- are deleted once resolved or expired; see
-- src/app/api/marketing/meta/callback/route.ts.
-- ---------------------------------------------------------------------------
create table if not exists marketing_oauth_pending (
  state text primary key,
  user_long_lived_token_encrypted text not null,
  pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- RLS — same "any authenticated Beach Kids user" shape as every other table.
-- ---------------------------------------------------------------------------
alter table marketing_settings enable row level security;
alter table marketing_posts enable row level security;
alter table marketing_post_media enable row level security;
alter table marketing_post_media_children enable row level security;
alter table marketing_post_platform_results enable row level security;
alter table marketing_dismissed_suggestions enable row level security;
alter table marketing_connections enable row level security;
alter table marketing_oauth_pending enable row level security;

drop policy if exists "marketing_settings_all_authenticated" on marketing_settings;
create policy "marketing_settings_all_authenticated" on marketing_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_posts_all_authenticated" on marketing_posts;
create policy "marketing_posts_all_authenticated" on marketing_posts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_post_media_all_authenticated" on marketing_post_media;
create policy "marketing_post_media_all_authenticated" on marketing_post_media
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_post_media_children_all_authenticated" on marketing_post_media_children;
create policy "marketing_post_media_children_all_authenticated" on marketing_post_media_children
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_post_platform_results_all_authenticated" on marketing_post_platform_results;
create policy "marketing_post_platform_results_all_authenticated" on marketing_post_platform_results
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_dismissed_suggestions_all_authenticated" on marketing_dismissed_suggestions;
create policy "marketing_dismissed_suggestions_all_authenticated" on marketing_dismissed_suggestions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_connections_all_authenticated" on marketing_connections;
create policy "marketing_connections_all_authenticated" on marketing_connections
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "marketing_oauth_pending_all_authenticated" on marketing_oauth_pending;
create policy "marketing_oauth_pending_all_authenticated" on marketing_oauth_pending
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Public storage bucket for marketing media. Public (unlike every other
-- bucket in this app) because Meta's Graph API publishes by fetching
-- image_url/video_url itself over the open internet — there's no way to
-- hand it a private signed URL. This is fine for what goes in it: content
-- that, once published, is about to be posted publicly to Facebook/
-- Instagram anyway. The actual permission gate is
-- marketing_posts.photo_permission_reviewed plus the per-child consent
-- check above, enforced before a post is allowed to schedule/publish —
-- never by hiding the file in storage.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media',
  'marketing-media',
  true,
  104857600, -- 100MB per file (covers short Reels video; re-check against
             -- Meta's current numeric limits before relying on the upper
             -- end of this — see src/lib/marketing/media-validation.ts)
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "marketing_media_bucket_select_public" on storage.objects;
create policy "marketing_media_bucket_select_public" on storage.objects
  for select using (bucket_id = 'marketing-media');

drop policy if exists "marketing_media_bucket_insert_authenticated" on storage.objects;
create policy "marketing_media_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'marketing-media' and auth.role() = 'authenticated');

drop policy if exists "marketing_media_bucket_update_authenticated" on storage.objects;
create policy "marketing_media_bucket_update_authenticated" on storage.objects
  for update using (bucket_id = 'marketing-media' and auth.role() = 'authenticated');

drop policy if exists "marketing_media_bucket_delete_authenticated" on storage.objects;
create policy "marketing_media_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'marketing-media' and auth.role() = 'authenticated');

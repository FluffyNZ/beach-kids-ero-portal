-- Beach Kids ERO Self-Audit Portal
-- Migration 0062: per-child "own / special sunblock" preference.
--
-- Powers the Sunblock Charts page (Children -> Sunblock charts): when a
-- child uses their own or a special sunblock instead of the centre's
-- standard one, their printed chart shows "OWN SUNBLOCK" under their name
-- plus whatever product/instructions are on file, instead of a plain tick
-- box like everyone else. Edited either from that chart (click a child's
-- name) or from the child's own profile (Health & permissions tab) -- both
-- read and write these same two columns, so they can never drift apart.
--
-- Deliberately separate from sunscreen CONSENT -- this app doesn't have a
-- consent-form data model for children anywhere yet (see
-- ChildHealthPanel's own existing note about that), so this isn't standing
-- in for it. This is purely "which sunblock do we use for this child",
-- nothing about permission to apply it.
--
-- Run this in the Supabase SQL editor after 0061, in order. Safe to run
-- more than once.

alter table children add column if not exists uses_own_sunblock boolean not null default false;
alter table children add column if not exists sunblock_instructions text;

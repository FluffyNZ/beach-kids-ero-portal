-- Beach Kids ERO Self-Audit Portal
-- Migration 0015: adds 'director' as a new staff_contract_type value.
--
-- IMPORTANT: run this file ON ITS OWN in the Supabase SQL editor (paste it
-- alone, click "Run", let it finish) — same reason as 0008a. Postgres
-- won't let a new enum value be added and then used (e.g. someone picks
-- "Director" from the dropdown) inside the same transaction the value was
-- added in. Running this by itself first commits the value; after that,
-- using it from the app works normally.
--
-- Run this in the Supabase SQL editor after 0001-0014, in order, on its
-- own. Safe to run more than once.

alter type staff_contract_type add value if not exists 'director';

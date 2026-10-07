-- Beach Kids ERO Self-Audit Portal
-- Migration 0044: Safety Checking required staff document category.
--
-- Adds "safety_check" as a new value wherever staff_documents.category is
-- restricted to a fixed set, for Beach Kids' periodic "Safety Check
-- Procedure Checklist" (the signed, ~3-yearly bundled sign-off covering
-- identity confirmation, records search, teacher registration, police
-- vet, work history, reference checking, interview, and risk assessment).
-- This is added as a NEW required document on every staff profile,
-- alongside the existing required categories — it does not replace
-- "Police Verification" or any other already-tracked category, since
-- Ethan's own request described it as "a required document like the
-- other ones."
--
-- staff_documents.category does not appear to be a locked-down Postgres
-- enum in this schema: no `staff_document_category` enum type shows up
-- in the migrations synced to the environment this was written in, and
-- the closest sibling column (evidence.category, from 0001_init.sql) is
-- plain text with no CHECK constraint. So this migration is written as a
-- safe no-op guard — it only alters an enum type if one by that name
-- actually exists, and does nothing otherwise:
do $$
begin
  if exists (select 1 from pg_type where typname = 'staff_document_category') then
    alter type staff_document_category add value if not exists 'safety_check';
  end if;
end $$;

-- If your database instead enforces the category list with a CHECK
-- constraint (rather than an enum), running this migration will be a
-- harmless no-op and uploading a document with category = 'safety_check'
-- will fail with a constraint-violation error rather than succeeding.
-- If that happens, tell me the exact error and I'll send a follow-up
-- migration that updates the real constraint — I can't see your live
-- schema from here to tell in advance which of these two cases applies.

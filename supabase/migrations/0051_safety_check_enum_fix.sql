-- Beach Kids ERO Self-Audit Portal
-- Migration 0051: fixes the "Safety Checking" document upload failing with
-- invalid input value for enum staff_document_category: "safety_check".
--
-- Migration 0044 was meant to add this value but wrapped the ALTER TYPE in
-- a guard ("only if an enum by this name exists") because at the time it
-- was written there was no way to confirm the live schema from here. The
-- error above confirms the enum does exist — it just never got this value
-- added, whether because 0044 was never run or the guard produced a no-op.
-- This migration adds it directly and unconditionally.
--
-- Run this on its own in the Supabase SQL editor (paste it alone, click
-- "Run", let it finish) — same reason as 0008a and 0016: Postgres won't
-- let a new enum value be added and then used inside the same transaction
-- it was added in. Safe to run more than once.

alter type staff_document_category add value if not exists 'safety_check';

-- Beach Kids ERO Self-Audit Portal
-- Migration 0017: new staff_document_category value so a staff profile can
-- require a second, different form of ID as well as the original
-- "Identification" required document.
--
-- IMPORTANT: run this file ON ITS OWN in the Supabase SQL editor (paste it
-- alone, click "Run", let it finish) — same reason as 0008a, 0015 and 0016.
-- Postgres won't let a new enum value be added and then used inside the
-- same transaction it was added in.
--
-- Run this in the Supabase SQL editor after 0001-0016, in order, on its own.
-- Safe to run more than once.

alter type staff_document_category add value if not exists 'secondary_identification';

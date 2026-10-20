-- Beach Kids ERO Self-Audit Portal
-- Migration 0063: per-staff tax code (e.g. "M", "S", "SL", "M SL").
--
-- Plain free-text, not an enum -- IRD tax codes combine (e.g. "M SL") and
-- the exact set in use can change, so this isn't worth hard-coding as a
-- fixed list anywhere.
--
-- Deliberately just the tax code. Bank account numbers and IRD numbers
-- stay out of this app entirely -- that's real financial/government-ID
-- data that belongs only in the payroll system it already lives in, not
-- duplicated here.
--
-- Run this in the Supabase SQL editor after 0062, in order. Safe to run
-- more than once.

alter table staff add column if not exists tax_code text;

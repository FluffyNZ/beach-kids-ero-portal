-- Beach Kids ERO Self-Audit Portal
-- Migration 0014: employment terms on the staff record itself — current
-- pay rate and contracted minimum hours per week. These sit on `staff`
-- (not staff_qualifications) since they're employment-contract terms
-- rather than qualification/pay-parity tracking.
--
-- Run this in the Supabase SQL editor after 0001-0013, in order. Safe to
-- run more than once.

alter table staff
  add column if not exists pay_rate numeric(10, 2),
  add column if not exists min_hours numeric(6, 2);

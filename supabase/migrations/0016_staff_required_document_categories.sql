-- Beach Kids ERO Self-Audit Portal
-- Migration 0016: three new staff_document_category values to support the
-- "8 required documents" model on each staff profile — Tax & KiwiSaver,
-- CV & Interview (one combined document), and Pay Parity Agreement.
--
-- IMPORTANT: run this file ON ITS OWN in the Supabase SQL editor (paste it
-- alone, click "Run", let it finish) — same reason as 0008a and 0015.
-- Postgres won't let a new enum value be added and then used inside the
-- same transaction it was added in.
--
-- Run this in the Supabase SQL editor after 0001-0015, in order, on its
-- own. Safe to run more than once.

alter type staff_document_category add value if not exists 'tax_kiwisaver';
alter type staff_document_category add value if not exists 'cv_interview';
alter type staff_document_category add value if not exists 'pay_parity_agreement';

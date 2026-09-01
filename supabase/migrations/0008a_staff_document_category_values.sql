-- Beach Kids ERO Self-Audit Portal
-- Migration 0008a: New staff_document_category enum values, split out on
-- their own.
--
-- WHY THIS FILE EXISTS: Postgres will not let you ADD a new enum value
-- and USE that same value (e.g. in an insert/cast) inside one and the
-- same transaction — you get "unsafe use of new value ... New enum
-- values must be committed before they can be used." The Supabase SQL
-- editor runs everything you paste in as a single transaction, so 0008
-- and 0009 (which both add values and immediately use them) fail there
-- even though they ran fine when tested statement-by-statement.
--
-- THE FIX: run this file FIRST, on its own (click "Run", let it finish),
-- so these values are committed. THEN run 0008, then 0009 — each can be
-- pasted and run normally after that, since by the time they use these
-- values, the values already exist from a prior, separate transaction.
--
-- Run this in the Supabase SQL editor after 0001-0007, in order, and
-- BEFORE 0008. Safe to run more than once.

alter type staff_document_category add value if not exists 'staff_profile_form';
alter type staff_document_category add value if not exists 'cv_work_history';
alter type staff_document_category add value if not exists 'job_description';
alter type staff_document_category add value if not exists 'interview_recruitment';
alter type staff_document_category add value if not exists 'induction';
alter type staff_document_category add value if not exists 'child_protection';

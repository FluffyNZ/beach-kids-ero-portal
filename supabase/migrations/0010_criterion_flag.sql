-- Beach Kids ERO Self-Audit Portal
-- Migration 0010: Add a flag to each ERO criterion, separate from
-- management notes — a quick "something's wrong here" marker with its own
-- description field, so a flagged concern doesn't get buried inside the
-- general management notes text.
--
-- Run this in the Supabase SQL editor after 0001-0009, in order. Safe to
-- run more than once.

alter table criterion_assessments add column if not exists is_flagged boolean not null default false;
alter table criterion_assessments add column if not exists flag_notes text;

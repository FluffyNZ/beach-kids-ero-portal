-- Beach Kids ERO Self-Audit Portal
-- Migration 0007: Contract type on staff — permanent, fixed-term, casual
-- or relief — so it can be highlighted on the staff directory and profile.
--
-- Run this in the Supabase SQL editor after 0001-0006, in order.

do $$ begin
  create type staff_contract_type as enum ('permanent', 'fixed_term', 'casual', 'relief');
exception when duplicate_object then null; end $$;

alter table staff add column if not exists contract_type staff_contract_type;

-- Beach Kids ERO Self-Audit Portal
-- Migration 0053: Recognised service — a free-text record alongside pay
-- parity step, same pattern as pay_parity_step itself (no fixed enum,
-- since how recognised service is expressed varies person to person).
--
-- Run this AFTER 0052_staff_contact_room_emergency.sql.

alter table staff_qualifications add column if not exists recognised_service text;

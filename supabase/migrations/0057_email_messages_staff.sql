-- Beach Kids ERO Self-Audit Portal
-- Migration 0057: Let an email be linked to a staff member, not just a
-- child/bill payer/family enquiry — needed so the Staff profile's
-- "Email staff" button can create a real, trackable email_messages row
-- the same way the Children & Fees "Email" flow already does.
--
-- Run this AFTER 0056_staff_growth_cycles.sql.

alter table email_messages add column if not exists staff_id uuid references staff(id) on delete set null;

create index if not exists idx_email_messages_staff on email_messages(staff_id);

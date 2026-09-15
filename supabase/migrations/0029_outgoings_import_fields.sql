-- -----------------------------------------------------------------------
-- Adds the columns needed to bulk-import a real accounting export (e.g. a
-- Xero transaction list) into finance_outgoings while keeping a full audit
-- trail back to the original source — important for an ERO self-audit
-- portal, where "where did this figure come from" has to stay answerable.
--
-- external_id      — the source system's own transaction id (e.g.
--                     "BK-OUT-0001"), used to avoid importing the same row
--                     twice on a re-import.
-- subcategory       — the finer-grained category from the source, kept
--                     alongside the broader `category` already on the table.
-- xero_account      — the ledger account the source system filed this under.
-- needs_more_detail — true when the source export flagged this line as not
--                     stating the exact item/job (a prompt to fill in later
--                     from the receipt, never a reason to invent detail now).
-- raw_description   — the original source description, deliberately left
--                     unedited so the accounting source can always be traced.
-- source_detail / source_reference — any extra source-system detail/reference.
-- -----------------------------------------------------------------------

alter table finance_outgoings add column if not exists external_id text;
alter table finance_outgoings add column if not exists subcategory text;
alter table finance_outgoings add column if not exists xero_account text;
alter table finance_outgoings add column if not exists needs_more_detail boolean not null default false;
alter table finance_outgoings add column if not exists raw_description text;
alter table finance_outgoings add column if not exists source_detail text;
alter table finance_outgoings add column if not exists source_reference text;

create unique index if not exists idx_finance_outgoings_external_id on finance_outgoings(external_id) where external_id is not null;

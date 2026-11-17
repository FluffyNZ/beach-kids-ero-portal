-- Beach Kids ERO Self-Audit Portal
-- Migration 0065: Per-child contacts (who can be called, who can pick up,
-- and who must NOT be given access).
--
-- Why a new table rather than reusing family_contacts: family_contacts hangs
-- off a bill payer (a whole family), which can't say "this person may pick
-- up Kora but isn't listed for Ryder", and has nowhere to record Forbidden
-- Access. Staff check the staff-room tablet child by child before releasing
-- a child, so the list has to be per child, with those markers as real
-- columns rather than text someone has to remember to type.
--
-- Nothing existing is changed: this only adds one table. family_contacts,
-- bill_payers and children are untouched by this file.
--
-- Run in the Supabase SQL editor after 0064_marketing.sql. Safe to run more
-- than once (every statement is "if not exists" / guarded), and it contains
-- no drop/delete statements.

create table if not exists public.child_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  full_name text not null,
  relationship text,
  -- Main number staff should call (usually a mobile).
  phone text,
  -- A second number for the same person (landline / daytime), if there is one.
  alt_phone text,
  is_primary_caregiver boolean not null default false,
  is_emergency_contact boolean not null default false,
  can_pick_up boolean not null default false,
  conditional_access boolean not null default false,
  forbidden_access boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  -- Safety net: someone marked Forbidden Access can never also be marked as
  -- allowed to pick up, whatever a form or import sends.
  constraint child_contacts_forbidden_cannot_pick_up check (not (forbidden_access and can_pick_up))
);

create index if not exists child_contacts_child_id_idx on public.child_contacts (child_id);

alter table public.child_contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'child_contacts' and policyname = 'child_contacts_all_authenticated'
  ) then
    create policy child_contacts_all_authenticated on public.child_contacts
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_child_contacts_updated' and tgrelid = 'public.child_contacts'::regclass
  ) then
    create trigger trg_child_contacts_updated
      before update on public.child_contacts
      for each row execute function set_updated_at();
  end if;
end $$;

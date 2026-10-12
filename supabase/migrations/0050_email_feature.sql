-- Beach Kids ERO Self-Audit Portal
-- Migration 0050: Email feature — templates, family contacts, enquiries,
-- email history, and two new date fields on children for the "starting /
-- leaving soon" reminders.
--
-- Run this AFTER 0049_child_schedule_tbc.sql, in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- children: two new nullable dates, purely informational — nothing here
-- auto-changes `status`. Marking a child "no longer attending" is still the
-- same explicit action it always was (see children.status / setChildStatus).
-- start_date is when a confirmed new enrolment begins; leaving_date is their
-- confirmed last day, settable ahead of that status change so the Email
-- page can show "Last day Friday" before the child has actually left.
-- ---------------------------------------------------------------------------
alter table children add column if not exists start_date date;
alter table children add column if not exists leaving_date date;

-- ---------------------------------------------------------------------------
-- family_contacts — additional named guardians for a family, alongside the
-- bill payer's own email/phone (unchanged — still the default recipient
-- everywhere it already is, e.g. invoices). Lets the Email workflow offer a
-- real choice of who an email goes to, rather than always assuming the bill
-- payer is the right person. Keyed to bill_payers — the family unit
-- children.ts already groups siblings by — not to one child, so siblings
-- share the same guardian list.
-- ---------------------------------------------------------------------------
create table if not exists family_contacts (
  id uuid primary key default gen_random_uuid(),
  bill_payer_id uuid not null references bill_payers(id) on delete cascade,
  full_name text not null,
  relationship text, -- free text, e.g. "Mum", "Dad", "Grandparent"
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_family_contacts_bill_payer on family_contacts(bill_payer_id);

drop trigger if exists trg_family_contacts_updated on family_contacts;
create trigger trg_family_contacts_updated before update on family_contacts
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- family_enquiries — a prospective family who isn't a real child/enrolment
-- yet. Deliberately NOT stored in `children` (which would need a child_status
-- enum change and risks an enquiry leaking into the many existing queries
-- that default to "every child who isn't status='left'" — attendance roll,
-- fees, roster ratios) — a separate table keeps an enquiry fully outside
-- active enrolments, attendance and billing by construction, with zero
-- changes to those existing queries. Once Ethan actually enrols them he
-- adds a real child the existing way (the "Add child" button);
-- converted_child_id is just a soft breadcrumb back to that record if he
-- marks it converted.
-- ---------------------------------------------------------------------------
create table if not exists family_enquiries (
  id uuid primary key default gen_random_uuid(),
  child_full_name text not null,
  parent_full_name text not null,
  parent_email text not null,
  parent_phone text,
  intended_room_id uuid references roster_rooms(id) on delete set null,
  intended_start_date date,
  status text not null default 'enquiry' check (status in ('enquiry', 'converted', 'dismissed')),
  converted_child_id uuid references children(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_family_enquiries_status on family_enquiries(status);

drop trigger if exists trg_family_enquiries_updated on family_enquiries;
create trigger trg_family_enquiries_updated before update on family_enquiries
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- email_templates — the 16 templates from the brief, seeded below with real
-- copy in Beach Kids' own voice (same "Kia ora" / whānau tone as the
-- existing invoice emails — see src/lib/email/invoice-email.ts). Fully
-- editable afterwards from the Email page — nothing here is hardcoded into
-- the app, so editing a template's wording doesn't need a code change or a
-- redeploy. `body` is plain text (blank line = new paragraph) with
-- {{tokens}} filled in at send time — see src/lib/email/template-email.ts
-- for the token list per template. A token with nothing to fill it is
-- flagged for review on the Review screen rather than ever sent blank.
-- ---------------------------------------------------------------------------
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  category text not null check (category in ('enrolment', 'everyday', 'fees', 'events')),
  icon text not null default 'mail',
  subject text not null,
  body text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

drop trigger if exists trg_email_templates_updated on email_templates;
create trigger trg_email_templates_updated before update on email_templates
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- email_messages — every drafted/sent email, against the child/family it's
-- for. `reminder_kind` + `reminder_event_date` together identify one
-- specific birthday/welcome/farewell occurrence (a real calendar date, so
-- next year's birthday is naturally a different occurrence) — the partial
-- unique index below is what stops the same occurrence being drafted or
-- sent twice, per the brief ("so we don't accidentally send it twice"). Ad
-- hoc and event-reminder emails leave both null and aren't deduplicated
-- this way — an event reminder to a room is many separate rows, one per
-- family, by design, so each family gets their own independently-tracked
-- send.
-- ---------------------------------------------------------------------------
create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  template_key text,
  child_id uuid references children(id) on delete set null,
  bill_payer_id uuid references bill_payers(id) on delete set null,
  family_enquiry_id uuid references family_enquiries(id) on delete set null,
  recipient_name text,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  reminder_kind text check (reminder_kind in ('birthday', 'welcome', 'farewell')),
  reminder_event_date date,
  attachments jsonb not null default '[]'::jsonb,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_email_messages_child on email_messages(child_id);
create index if not exists idx_email_messages_bill_payer on email_messages(bill_payer_id);
create index if not exists idx_email_messages_status on email_messages(status);
create index if not exists idx_email_messages_template on email_messages(template_key);

-- One live (non-failed) draft/sent row per child+kind+occurrence. A failed
-- send is deliberately excluded from the constraint so retrying after a
-- failure is never blocked by it.
create unique index if not exists uniq_email_messages_reminder_occurrence
  on email_messages(child_id, reminder_kind, reminder_event_date)
  where reminder_kind is not null and status <> 'failed';

drop trigger if exists trg_email_messages_updated on email_messages;
create trigger trg_email_messages_updated before update on email_messages
  for each row execute procedure set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — same "any authenticated Beach Kids user" shape as every other table
-- in this app (see 0002_rls.sql's own comment on why that's the right
-- policy for a single-organisation system).
-- ---------------------------------------------------------------------------
alter table family_contacts enable row level security;
alter table family_enquiries enable row level security;
alter table email_templates enable row level security;
alter table email_messages enable row level security;

drop policy if exists "family_contacts_all_authenticated" on family_contacts;
create policy "family_contacts_all_authenticated" on family_contacts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "family_enquiries_all_authenticated" on family_enquiries;
create policy "family_enquiries_all_authenticated" on family_enquiries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "email_templates_all_authenticated" on email_templates;
create policy "email_templates_all_authenticated" on email_templates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "email_messages_all_authenticated" on email_messages;
create policy "email_messages_all_authenticated" on email_messages
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Private storage bucket for email attachments (FamilyBoost documents,
-- anything else attached to a one-off send) — same shape as the `evidence`
-- bucket in 0002_rls.sql. Never public; every send downloads the file
-- server-side and attaches it directly to that one family's email, so a
-- document is never reachable by a shared link and never reaches more than
-- the family it was attached for.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-attachments',
  'email-attachments',
  false,
  26214400, -- 25MB per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

drop policy if exists "email_attachments_bucket_select_authenticated" on storage.objects;
create policy "email_attachments_bucket_select_authenticated" on storage.objects
  for select using (bucket_id = 'email-attachments' and auth.role() = 'authenticated');

drop policy if exists "email_attachments_bucket_insert_authenticated" on storage.objects;
create policy "email_attachments_bucket_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'email-attachments' and auth.role() = 'authenticated');

drop policy if exists "email_attachments_bucket_delete_authenticated" on storage.objects;
create policy "email_attachments_bucket_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'email-attachments' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Seed the 16 templates from the brief. Each uses dollar-quoting for its
-- body so the many natural contractions ("we're", "don't", "whānau's")
-- don't need manual escaping. `on conflict (key) do nothing` means re-running
-- this migration never clobbers wording Ethan has since edited from the UI.
-- ---------------------------------------------------------------------------

insert into email_templates (key, label, category, icon, subject, body, sort_order) values
('new_enquiry', 'New enquiry', 'enrolment', 'mail',
'Thanks for your enquiry — Beach Kids',
$tpl$Kia ora {{parent_name}},

Thanks so much for getting in touch about {{child_name}} joining us at Beach Kids. We'd love to find out more about what you're after and see how we can help.

Could you let us know a bit about the days and hours you're looking for, and {{child_name}}'s preferred start date? We'll come back to you with availability and next steps — usually a quick visit to see the centre and meet the team.

If you've got any questions in the meantime, just reply to this email or give us a call.

Ngā mihi,
Beach Kids$tpl$,
10),

('welcome', 'Welcome to Beach Kids', 'enrolment', 'people',
'Welcome to Beach Kids, {{child_name}}!',
$tpl$Kia ora {{parent_name}},

We're rapt to welcome {{child_name}} to the Beach Kids whānau! {{child_name}} will be joining us in {{room_name}}.

We'll be in touch shortly about settling visits before the official start date, so {{child_name}} can get comfortable with the space and the team before diving in.

If anything comes to mind in the meantime — paperwork, routines, anything at all — just ask.

Ngā mihi nui,
Beach Kids$tpl$,
20),

('settling_visits', 'Settling visits', 'enrolment', 'calendar',
'Settling visits for {{child_name}}',
$tpl$Kia ora {{parent_name}},

Before {{child_name}} officially starts with us, we like to arrange a couple of settling visits — short, relaxed sessions so {{child_name}} can get to know {{room_name}} and the team at their own pace.

Let us know some times that suit and we'll lock in a visit or two over the coming weeks.

Looking forward to it!

Ngā mihi,
Beach Kids$tpl$,
30),

('starting_soon', 'Starting soon', 'enrolment', 'document',
'{{child_name}}''s first day is coming up',
$tpl$Kia ora {{parent_name}},

Just a friendly note that {{child_name}}'s first day with us in {{room_name}} is {{start_date}}.

A few things to bring on the day: a labelled bag, a change of clothes, a sunhat, and anything comforting from home that might help {{child_name}} settle in — a favourite toy or blanket is always welcome.

We can't wait to meet {{child_name}} properly — see you soon!

Ngā mihi,
Beach Kids$tpl$,
40),

('birthday_wishes', 'Birthday wishes', 'everyday', 'gift',
'Happy birthday, {{child_name}}!',
$tpl$Kia ora {{parent_name}},

The whole team at Beach Kids wants to wish {{child_name}} a very happy {{turning_age}} birthday!

We hope the day is full of fun, cake and cuddles. {{child_name}} is such a special part of our {{room_name}} whānau and we're lucky to have them.

Have a wonderful day!

Ngā mihi,
Beach Kids$tpl$,
50),

('turning_three', 'Turning three / 20 Hours ECE', 'fees', 'star',
'{{child_name}} is turning 3 — 20 Hours ECE',
$tpl$Kia ora {{parent_name}},

{{child_name}} is turning 3 soon, which means they'll become eligible for 20 Hours ECE funding. This can reduce the fees for part of {{child_name}}'s enrolled hours.

We'll apply the funding against {{child_name}}'s fees once they're eligible — there's nothing you need to do on our end. If you have any questions about how this affects your invoices, just let us know.

Ngā mihi,
Beach Kids$tpl$,
60),

('room_transition', 'Room transition', 'everyday', 'home',
'{{child_name}} is moving to {{room_name}}',
$tpl$Kia ora {{parent_name}},

As {{child_name}} continues to grow, it's time for a room transition! {{child_name}} will be moving into {{room_name}}.

We'll ease {{child_name}} into the new room gradually, with plenty of visits alongside their current team before the move is final, so it feels like a natural step rather than a big change.

We'll keep you posted on how the transition is going. Let us know if you have any questions.

Ngā mihi,
Beach Kids$tpl$,
70),

('session_changes', 'Session changes', 'everyday', 'calendar',
'Confirming {{child_name}}''s booked days and hours',
$tpl$Kia ora {{parent_name}},

Just confirming {{child_name}}'s current booked sessions with us:

{{booked_sessions}}

If anything here doesn't look right, or you'd like to change {{child_name}}'s days or hours, just let us know and we'll sort it out.

Ngā mihi,
Beach Kids$tpl$,
80),

('missing_paperwork', 'Missing paperwork', 'enrolment', 'document',
'A couple of forms we still need for {{child_name}}',
$tpl$Kia ora {{parent_name}},

We're just missing a few bits of paperwork for {{child_name}}'s file. Could you get these back to us when you get a chance?

{{missing_items}}

If you've already sent these through, apologies — just let us know and we'll check our records.

Ngā mihi,
Beach Kids$tpl$,
90),

('winz_renewal', 'WINZ renewal', 'fees', 'document',
'{{child_name}}''s WINZ Childcare Subsidy is due for renewal',
$tpl$Kia ora {{parent_name}},

Just a heads up that {{child_name}}'s WINZ Childcare Subsidy is coming up for renewal. To keep it current — and avoid a gap in your subsidised fees — you'll need to renew this with Work and Income before it lapses.

If you'd like a hand with the process or have any questions, just let us know.

Ngā mihi,
Beach Kids$tpl$,
100),

('familyboost_info', 'FamilyBoost information', 'fees', 'people',
'FamilyBoost — getting money back on {{child_name}}''s fees',
$tpl$Kia ora {{parent_name}},

FamilyBoost is an IRD payment that can give back some of what you pay in childcare fees. It's separate from anything we apply automatically — you claim it directly through IRD.

You can find out more and apply here: https://www.ird.govt.nz/familyboost

If you'd like copies of {{child_name}}'s invoices or receipts to support a claim, just ask and we'll get them to you.

Ngā mihi,
Beach Kids$tpl$,
110),

('familyboost_documents', 'FamilyBoost documents', 'fees', 'document',
'Your FamilyBoost documents for {{child_name}}',
$tpl$Kia ora {{parent_name}},

Attached are the documents you'll need for your FamilyBoost claim for {{child_name}}.

If IRD needs anything else from us, just let us know.

Ngā mihi,
Beach Kids$tpl$,
120),

('payment_reminder', 'Payment reminder', 'fees', 'creditcard',
'Friendly reminder — {{child_name}}''s account',
$tpl$Kia ora {{parent_name}},

Just a friendly reminder that there's an outstanding balance on {{child_name}}'s account. If you've already paid, no need to do anything — it may just not have come through to us yet.

If paying is tricky at the moment, no stress — get in touch and we can sort out a plan that works for you.

Ngā mihi,
Beach Kids$tpl$,
130),

('event_reminder', 'Event reminder', 'events', 'calendar',
'{{event_name}} — coming up',
$tpl$Kia ora {{parent_name}},

Just a reminder about {{event_name}}, coming up soon.

{{event_details}}

Looking forward to seeing you there!

Ngā mihi,
Beach Kids$tpl$,
140),

('absence_checkin', 'Absence check-in', 'everyday', 'chat',
'Checking in — {{child_name}}',
$tpl$Kia ora {{parent_name}},

We noticed {{child_name}} hasn't been in for their usual sessions recently and just wanted to check in and make sure everything's okay.

No need to reply if everything's fine — just let us know if there's anything we can help with, or if {{child_name}}'s days need adjusting.

Ngā mihi,
Beach Kids$tpl$,
150),

('farewell', 'Farewell', 'events', 'heart',
'Farewell, {{child_name}} — thank you from Beach Kids',
$tpl$Kia ora {{parent_name}},

We just wanted to say thank you and send our best wishes as {{child_name}}'s time with us at Beach Kids comes to an end. {{child_name}}'s last day with us will be {{last_day}}.

It's been a privilege watching {{child_name}} grow with us in {{room_name}}, and we're so grateful to have had your whānau as part of the Beach Kids community.

Wishing you all the very best for what's next!

Ngā mihi nui,
Beach Kids$tpl$,
160)

on conflict (key) do nothing;

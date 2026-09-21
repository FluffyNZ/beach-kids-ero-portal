-- Beach Kids ERO Self-Audit Portal
-- Migration 0038: Backfill dates of birth for the Centre Calendar's
-- birthday feature.
--
-- Source: two reports Ethan supplied on 2026-09-22 —
--   - Report_Staff_Details_202609221114083044.pdf ("Staff Details",
--     Beach Kids Waihi)
--   - Report_Children_Details_202609221111151933.pdf ("Child Details for
--     27-Jul-2026 to 30-Sep-2026", Beach Kids Waihi)
-- Every date below is transcribed directly from those reports.
--
-- Ethan asked to skip staff who've left and only use currently enrolled
-- children — both are handled the same way: each UPDATE only touches a
-- row that already exists, is marked status = 'active', and doesn't
-- already have a date of birth on file (so this never overwrites anything
-- you've since entered by hand, and is safe to run more than once). A
-- name with no active match — a former staff member, a child who's left,
-- or a name that doesn't match anything on file — is silently left alone
-- by design. The verification query at the bottom lists exactly which
-- names that happened for, so nothing goes missing without you knowing.
--
-- Staff/children with a blank birthdate cell on the source report are
-- left out of this migration entirely — nothing to enter for them.
--
-- Three names needed a judgement call rather than a blind guess:
--   - The children's report lists "Sia Rabab" — migration 0034 already
--     established (confirmed with you at the time) that this is the same
--     child as the currently active "Rabab Jeph Sidhu", so that name is
--     used directly here instead of the report's version.
--   - "Kingston O'Connell - Wharawhara" is tried under both that spelling
--     and "Kingston O'Connell-Wharawhara" (no spaces around the hyphen).
--     Migration 0034 recorded a sibling, "Kennedy O'Connell-Wharawhara",
--     stored in the no-space form, so that's the more likely spelling —
--     but it isn't assumed; if neither matches, it'll show up below.
--   - "Tūī Percy" is likewise tried both with and without the macron
--     ("Tui Percy"), in case the profile was entered without it.
--
-- Run this in the Supabase SQL editor after 0037_centre_calendar.sql.

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

with staff_birthdates (full_name, dob) as (
  values
    ('Amy Vidler', date '1986-02-24'),
    ('Eilleen Coulter', date '1959-05-20'),
    ('Ethan Coulter', date '1997-01-30'),
    ('Graham Coulter', date '1957-02-16'),
    ('Jessica Grant', date '1991-05-20'),
    ('Katelyn Tamahere', date '2003-06-13'),
    ('Louise Young', date '1983-06-16'),
    ('Lynne Atkin', date '1961-03-08'),
    ('Marie Gudsell', date '1967-11-11'),
    ('Michelle Baker', date '1981-06-28'),
    ('Michelle Burr', date '1981-07-17'),
    ('Mish Claire', date '1990-07-05'),
    ('Natasha Papps', date '1995-11-11'),
    ('Nyah Frew', date '1999-04-15'),
    ('Rebecca Higgins', date '1990-06-06'),
    ('Rebekah Bird', date '1986-07-17'),
    ('Rochelle Rutledge', date '1981-01-17'),
    ('Samantha Brown', date '1991-12-09'),
    ('Tracey Taylor', date '1967-12-19'),
    ('Verity Watson', date '1982-12-30')
)
update staff s
set date_of_birth = b.dob
from staff_birthdates b
where s.full_name = b.full_name
  and s.status = 'active'
  and s.date_of_birth is null;

-- ---------------------------------------------------------------------------
-- Children
-- ---------------------------------------------------------------------------

with child_birthdates (full_name, dob) as (
  values
    ('Aaliyah De Bruin', date '2022-12-21'),
    ('Amelia Claire Broomfield', date '2022-08-08'),
    ('Amroz Kaur Nehal', date '2024-12-31'),
    ('Aneila Williams', date '2024-02-12'),
    ('Archie Young', date '2025-02-21'),
    ('Aria Murray', date '2022-05-14'),
    ('Aterea Johns', date '2021-09-23'),
    ('Aura Ormsby', date '2024-06-07'),
    ('Ava McPherson', date '2023-09-27'),
    ('Brandon Wallace', date '2023-03-31'),
    ('Cecelia Carnachan', date '2023-07-17'),
    ('Daisy Stroobant', date '2024-05-05'),
    ('Ella Mcbirney', date '2022-05-04'),
    ('Esme Frauendorf', date '2023-08-10'),
    ('Finn Keatley', date '2023-04-26'),
    ('Freya Singleton Wilson', date '2025-07-26'),
    ('Gray Spargo', date '2024-04-24'),
    ('Harlem Tangira-Paul', date '2021-07-24'),
    ('Hudson Carnachan', date '2025-11-06'),
    ('Ihorei Wall-Church', date '2022-12-29'),
    ('Indica Bidois', date '2023-08-10'),
    ('Isabelle Higgins', date '2024-09-20'),
    ('Isla McPherson', date '2023-09-27'),
    ('James Measures', date '2023-09-05'),
    ('Kaabil Singh', date '2022-03-30'),
    ('Kenny Choat', date '2022-01-21'),
    ('Keonna Cerna', date '2024-06-02'),
    ('Kingston O''Connell - Wharawhara', date '2024-04-24'),
    ('Kingston O''Connell-Wharawhara', date '2024-04-24'),
    ('Koa Iti', date '2024-10-18'),
    ('Kora Milanesi', date '2022-07-07'),
    ('Kyrie Turnbull', date '2023-07-10'),
    ('Layla Paul', date '2024-09-27'),
    ('Luca Williams', date '2025-09-14'),
    ('Lyla Seymour', date '2026-03-24'),
    ('Maria Scheer', date '2025-05-05'),
    ('McKenize Singh Savage', date '2025-02-01'),
    ('Micah Murray', date '2024-04-17'),
    ('Oliver Obeda', date '2021-05-11'),
    ('Phoenix Cox', date '2022-07-12'),
    ('Princedeep Singh Savage', date '2022-06-22'),
    ('Roman Oakley', date '2022-05-13'),
    ('Ruiha Tamihere', date '2024-03-27'),
    ('Ryder Milanesi', date '2024-09-02'),
    ('Samuel Higgins', date '2021-10-31'),
    ('Sean Lu', date '2024-09-19'),
    ('Rabab Jeph Sidhu', date '2024-10-31'), -- report's "Sia Rabab" — see note above
    ('Tate Mcbirney', date '2024-02-14'),
    ('Tatum Matich', date '2023-05-21'),
    ('Toby Carnachan', date '2024-09-09'),
    ('Tūī Percy', date '2022-07-26'),
    ('Tui Percy', date '2022-07-26'),
    ('Vardaan Singh Nehal', date '2023-03-25'),
    ('Violet Groenestein', date '2025-09-13'),
    ('Will Chen', date '2022-11-21'),
    ('Zac Jensen', date '2022-10-06')
)
update children c
set date_of_birth = b.dob
from child_birthdates b
where c.full_name = b.full_name
  and c.status = 'active'
  and c.date_of_birth is null;

-- ---------------------------------------------------------------------------
-- Verification — run this after the two updates above. Every row it
-- returns is a name from one of the reports that did NOT end up with a
-- birthdate: either they're correctly not active (a former staff member
-- or a child who's left) or the name doesn't match anything on file and
-- is worth double-checking the spelling for.
-- ---------------------------------------------------------------------------

select 'staff' as kind, b.full_name
from (values
  ('Amy Vidler'), ('Eilleen Coulter'), ('Ethan Coulter'), ('Graham Coulter'),
  ('Jessica Grant'), ('Katelyn Tamahere'), ('Louise Young'), ('Lynne Atkin'),
  ('Marie Gudsell'), ('Michelle Baker'), ('Michelle Burr'), ('Mish Claire'),
  ('Natasha Papps'), ('Nyah Frew'), ('Rebecca Higgins'), ('Rebekah Bird'),
  ('Rochelle Rutledge'), ('Samantha Brown'), ('Tracey Taylor'), ('Verity Watson')
) as b(full_name)
where not exists (
  select 1 from staff s where s.full_name = b.full_name and s.status = 'active'
)

union all

select 'child', b.full_name
from (values
  ('Aaliyah De Bruin'), ('Amelia Claire Broomfield'), ('Amroz Kaur Nehal'),
  ('Aneila Williams'), ('Archie Young'), ('Aria Murray'), ('Aterea Johns'),
  ('Aura Ormsby'), ('Ava McPherson'), ('Brandon Wallace'), ('Cecelia Carnachan'),
  ('Daisy Stroobant'), ('Ella Mcbirney'), ('Esme Frauendorf'), ('Finn Keatley'),
  ('Freya Singleton Wilson'), ('Gray Spargo'), ('Harlem Tangira-Paul'),
  ('Hudson Carnachan'), ('Ihorei Wall-Church'), ('Indica Bidois'),
  ('Isabelle Higgins'), ('Isla McPherson'), ('James Measures'), ('Kaabil Singh'),
  ('Kenny Choat'), ('Keonna Cerna'), ('Koa Iti'), ('Kora Milanesi'),
  ('Kyrie Turnbull'), ('Layla Paul'), ('Luca Williams'), ('Lyla Seymour'),
  ('Maria Scheer'), ('McKenize Singh Savage'), ('Micah Murray'), ('Oliver Obeda'),
  ('Phoenix Cox'), ('Princedeep Singh Savage'), ('Roman Oakley'), ('Ruiha Tamihere'),
  ('Ryder Milanesi'), ('Samuel Higgins'), ('Sean Lu'), ('Tate Mcbirney'),
  ('Tatum Matich'), ('Toby Carnachan'), ('Vardaan Singh Nehal'),
  ('Violet Groenestein'), ('Will Chen'), ('Zac Jensen')
  -- Kingston O'Connell-Wharawhara, Sia Rabab/Rabab Jeph Sidhu, and
  -- Tūī/Tui Percy are checked separately below since each has more than
  -- one possible spelling on file.
) as b(full_name)
where not exists (
  select 1 from children c where c.full_name = b.full_name and c.status = 'active'
)

union all

select 'child (check spelling)', 'Kingston O''Connell - Wharawhara / Kingston O''Connell-Wharawhara'
where not exists (
  select 1 from children c where c.status = 'active'
    and c.full_name in ('Kingston O''Connell - Wharawhara', 'Kingston O''Connell-Wharawhara')
)

union all

select 'child (check spelling)', 'Rabab Jeph Sidhu (report: Sia Rabab)'
where not exists (
  select 1 from children c where c.status = 'active' and c.full_name = 'Rabab Jeph Sidhu'
)

union all

select 'child (check spelling)', 'Tūī Percy / Tui Percy'
where not exists (
  select 1 from children c where c.status = 'active' and c.full_name in ('Tūī Percy', 'Tui Percy')
);

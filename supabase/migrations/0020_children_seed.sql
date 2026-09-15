-- Beach Kids ERO Self-Audit Portal
-- Migration 0020: Children & Fees — real seed data.
--
-- Every name, age, room, bill payer and fee setting below is transcribed
-- directly from the real uploaded fees report
-- (Beach_Kids_Weekly_Fees_Report_10_Aug_2026_FINAL.xlsx, week beginning
-- 10/08/2026) and its WINZ tab — nothing here is invented. Ages are as
-- reported in the Aug 2026 child details report the fees report was
-- built from, recorded here as of 2026-08-18.
--
-- Three children mentioned in that report's Checks tab (Keonna Cerna,
-- Lyla Seymour, Sia Rabab) are NOT included here — the fees report only
-- flags that they exist, without their age/room/bill payer, so adding
-- them would mean guessing those fields. Add them for real once their
-- details are available (see the child details / contacts reports).
--
-- Run this in the Supabase SQL editor straight after 0019_children.sql.
-- Safe to run more than once — every insert is idempotent.

-- ---------------------------------------------------------------------------
-- bill_payers
-- ---------------------------------------------------------------------------
insert into bill_payers (full_name) values
  ('Aleisha Oakley'),
  ('Alison Lu'),
  ('Ashlee McCarthy'),
  ('Ashleigh Wilson'),
  ('Avalon Paul'),
  ('Aysha Singleton'),
  ('Bianca Williams'),
  ('Chris Scheer'),
  ('Craig Higgins'),
  ('Daniele Savage'),
  ('Georgia Kainamu'),
  ('Harpreet Kaur'),
  ('Heather Stuart-Wallace'),
  ('Jasdeep Singh'),
  ('Jaspreet kaur'),
  ('Jimikah Tawhara'),
  ('Juanita Brown'),
  ('Juanite Kena'),
  ('Katelyn Tamihere'),
  ('Kaylea Choat'),
  ('Llenel Reynolds'),
  ('Louise Young'),
  ('Madison Hall'),
  ('Maxine Paul'),
  ('Myah Robins'),
  ('Natasha Broomfield'),
  ('Nyah Frew'),
  ('Oshanna Wakelin'),
  ('Quest Frost'),
  ('Rachel Carnachan'),
  ('Rebecca Higgins'),
  ('Rebekah Bird'),
  ('Samantha Stroobant'),
  ('Shelley Frauendorf'),
  ('Stephanie Dykstra'),
  ('Stevie Iti'),
  ('Summer Spittal'),
  ('Wairau Wall'),
  ('William Ross')
on conflict (full_name) do nothing;

-- ---------------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------------
insert into children (full_name, age_years, age_months, age_as_of, room_id, room_notes, bill_payer_id, bill_payer_unlisted_note, status, twenty_hours_ece, special_weekly_override, notes)
select v.full_name, v.age_years, v.age_months, date '2026-08-18', rr.id, v.room_notes, bp.id, v.bill_payer_unlisted_note, 'active'::child_status, v.twenty_hours_ece, v.special_weekly_override, v.notes
from (values
  ('Amroz Kaur Nehal', 1, 7, 'Tainui', null, 'Harpreet Kaur', null, false, null, null),
  ('Archie Young', 1, 5, 'Tainui', null, 'Louise Young', null, false, null, null),
  ('Freya Singleton Wilson', 1, 0, 'Tainui', null, 'Aysha Singleton', null, false, null, null),
  ('Hudson Carnachan', 0, 9, 'Tainui', null, 'Rachel Carnachan', null, false, null, '10% sibling discount applied'),
  ('Isabelle Higgins', 1, 10, 'Tainui', null, 'Craig Higgins', null, false, null, null),
  ('Koa Iti', 1, 10, 'Tainui', null, 'Stevie Iti', null, false, null, null),
  ('Layla Paul', 1, 10, 'Tainui', null, 'Maxine Paul', null, false, null, null),
  ('Luca Williams', 0, 11, 'Tainui', null, 'Nyah Frew', null, false, null, '10% sibling discount applied'),
  ('Maria Scheer', 1, 3, 'Tainui', null, 'Chris Scheer', null, false, null, null),
  ('McKenize Singh Savage', 1, 6, 'Tainui', null, 'Daniele Savage', null, false, null, 'CHECK: WINZ payment exceeds fee under current attendance/20 Hours ECE assumptions; 10% sibling discount applied'),
  ('Micah Murray', 2, 4, 'Tainui', null, 'Jimikah Tawhara', null, false, null, '10% sibling discount applied'),
  ('Ryder Milanesi', 1, 11, 'Tainui', null, 'Madison Hall', null, false, 30, 'Special agreed parent rate entered as $30/week; 10% sibling discount applied'),
  ('Sean Lu', 1, 10, 'Tainui', null, 'Alison Lu', null, false, null, '10% sibling discount applied'),
  ('Toby Carnachan', 1, 11, 'Tainui', null, 'Rachel Carnachan', null, false, null, '10% sibling discount applied'),
  ('Violet Groenestein', 0, 11, 'Tainui', null, 'Samantha Stroobant', null, false, null, 'Check whether any current enrolment discount still applies; 10% sibling discount applied'),
  ('Aneila Williams', 2, 6, 'Ohinemuri', null, 'Nyah Frew', null, false, null, '10% sibling discount applied'),
  ('Aura Ormsby', 2, 2, 'Ohinemuri', null, 'Oshanna Wakelin', null, false, null, null),
  ('Ava McPherson', 2, 10, 'Ohinemuri', null, 'Llenel Reynolds', null, false, null, '10% sibling discount applied'),
  ('Brandon Wallace', 3, 4, 'Ohinemuri', null, 'Heather Stuart-Wallace', null, true, null, 'CHECK: WINZ payment exceeds fee under current attendance/20 Hours ECE assumptions'),
  ('Cecelia Carnachan', 3, 1, 'Ohinemuri', null, 'Rachel Carnachan', null, true, null, '10% sibling discount applied'),
  ('Daisy Stroobant', 2, 3, 'Ohinemuri', null, 'Samantha Stroobant', null, false, null, 'CHECK: WINZ payment exceeds fee under current attendance/20 Hours ECE assumptions; 10% sibling discount applied'),
  ('Esme Frauendorf', 3, 0, 'Ohinemuri', null, 'Shelley Frauendorf', null, true, null, '3 x 8-hour days; standard 20 Hours ECE calculation = $45/week'),
  ('Finn Keatley', 3, 3, 'Ohinemuri', null, 'Bianca Williams', null, true, null, null),
  ('Gray Spargo', 2, 3, 'Ohinemuri', null, 'Georgia Kainamu', null, false, null, null),
  ('Indica Bidois', 3, 0, 'Ohinemuri', null, 'Myah Robins', null, true, null, 'CHECK: WINZ payment exceeds fee under current attendance/20 Hours ECE assumptions'),
  ('Isla McPherson', 2, 10, 'Ohinemuri', null, 'Llenel Reynolds', null, false, null, '10% sibling discount applied'),
  ('James Measures', 2, 11, 'Ohinemuri', null, 'Juanite Kena', null, false, null, null),
  ('Kingston O''Connell - Wharawhara', 2, 3, 'Ohinemuri', null, null, 'Not listed in contact report', false, null, 'Bill payer not listed in supplied contacts report'),
  ('Kyrie Turnbull', 3, 1, 'Ohinemuri', null, 'Quest Frost', null, true, null, 'CHECK: WINZ payment exceeds fee under current attendance/20 Hours ECE assumptions'),
  ('Ruiha Tamihere', 2, 4, 'Ohinemuri', null, 'Katelyn Tamihere', null, false, null, null),
  ('Tate Mcbirney', 2, 6, 'Ohinemuri', null, 'Stephanie Dykstra', null, false, null, '10% sibling discount applied'),
  ('Tatum Matich', 3, 2, 'Ohinemuri', null, 'Ashlee McCarthy', null, true, null, null),
  ('Vardaan Singh Nehal', 3, 4, 'Ohinemuri', null, 'Jasdeep Singh', null, true, null, null),
  ('Will Chen', 3, 8, 'Ohinemuri', null, 'Alison Lu', null, true, null, '10% sibling discount applied'),
  ('Amelia Claire Broomfield', 4, 0, null, 'Room recorded as "Ohinemuri/Pukewa" in the source fees report — confirm the primary room.', 'Natasha Broomfield', null, true, null, null),
  ('Aaliyah De Bruin', 3, 7, 'Pukewa', null, 'Summer Spittal', null, true, null, null),
  ('Aria Murray', 4, 3, 'Pukewa', null, 'Jimikah Tawhara', null, true, null, '10% sibling discount applied'),
  ('Aterea Johns', 4, 10, 'Pukewa', null, 'Juanita Brown', null, true, null, null),
  ('Ella Mcbirney', 4, 3, 'Pukewa', null, 'Stephanie Dykstra', null, true, null, '10% sibling discount applied'),
  ('Harlem Tangira-Paul', 5, 0, 'Pukewa', null, 'Avalon Paul', null, true, null, null),
  ('Ihorei Wall-Church', 3, 7, 'Pukewa', null, 'Wairau Wall', null, true, null, 'WINZ application not shown on this statement — check status before invoicing'),
  ('Kaabil Singh', 4, 4, 'Pukewa', null, 'Jaspreet kaur', null, true, null, null),
  ('Kenny Choat', 4, 6, 'Pukewa', null, 'Kaylea Choat', null, true, null, null),
  ('Kora Milanesi', 4, 1, 'Pukewa', null, 'Madison Hall', null, true, null, '10% sibling discount applied'),
  ('Oliver Obeda', 5, 3, 'Pukewa', null, 'Rebekah Bird', null, true, null, null),
  ('Phoenix Cox', 4, 1, 'Pukewa', null, 'William Ross', null, true, null, null),
  ('Princedeep Singh Savage', 4, 1, 'Pukewa', null, 'Daniele Savage', null, true, null, 'CHECK: WINZ payment exceeds fee under current attendance/20 Hours ECE assumptions; 10% sibling discount applied'),
  ('Roman Oakley', 4, 3, 'Pukewa', null, 'Aleisha Oakley', null, true, null, null),
  ('Samuel Higgins', 4, 9, 'Pukewa', null, 'Rebecca Higgins', null, true, null, null),
  ('Zac Jensen', 3, 10, 'Pukewa', null, 'Ashleigh Wilson', null, true, null, null)
) as v(full_name, age_years, age_months, room_name, room_notes, bill_payer_name, bill_payer_unlisted_note, twenty_hours_ece, special_weekly_override, notes)
left join roster_rooms rr on rr.name = v.room_name
left join bill_payers bp on bp.full_name = v.bill_payer_name
where not exists (select 1 from children c where c.full_name = v.full_name);

-- ---------------------------------------------------------------------------
-- child_winz_subsidies
-- ---------------------------------------------------------------------------
insert into child_winz_subsidies (child_id, caregiver_name, weekly_cca_hours, weekly_payment, renewal_date)
select ch.id, v.caregiver_name, v.weekly_cca_hours, v.weekly_payment, v.renewal_date::date
from (values
  ('Aaliyah De Bruin', 'Summer Spittal', 10, 67.2, '2026-11-23'),
  ('Amroz Kaur Nehal', 'Harpreet Dhanoa', 9, 48.24, '2027-07-12'),
  ('Ava McPherson', 'Llenel Reynolds', 9, 60.48, '2027-04-19'),
  ('Brandon Wallace', 'Heather Bruce Alexandria Stuart', 18, 120.96, '2026-10-05'),
  ('Daisy Stroobant', 'Samantha Stroobant', 40, 268.8, '2027-03-15'),
  ('Indica Bidois', 'Myah Maree Robins', 9, 60.48, '2026-12-21'),
  ('Isabelle Higgins', 'Rebecca Maree Higgins', 33, 123.75, '2027-05-17'),
  ('Isla McPherson', 'Llenel Reynolds', 9, 60.48, '2027-04-19'),
  ('Kyrie Turnbull', 'Quest T H C Frost', 9, 60.48, '2027-03-01'),
  ('Luca Williams', 'Nyah Rae Frew', 12, 67.5, '2027-05-17'),
  ('McKenize Singh Savage', 'Daniele Katarina Savage', 24, 161.28, '2027-02-22'),
  ('Micah Murray', 'Kyha Lathanual Murray', 14, 94.08, '2027-05-03'),
  ('Princedeep Singh Savage', 'Daniele Katarina Savage', 4, 26.88, '2027-02-22'),
  ('Ruiha Tamihere', 'Katelyn Ruiha Ann Tamihere', 9, 60.48, '2026-09-07'),
  ('Ryder Milanesi', 'Madison Ella Hall', 7, 20, '2027-04-05'),
  ('Samuel Higgins', 'Rebecca Maree Higgins', 13, 48.75, '2027-05-17')
) as v(child_name, caregiver_name, weekly_cca_hours, weekly_payment, renewal_date)
join children ch on ch.full_name = v.child_name
on conflict (child_id) do update set
  caregiver_name = excluded.caregiver_name,
  weekly_cca_hours = excluded.weekly_cca_hours,
  weekly_payment = excluded.weekly_payment,
  renewal_date = excluded.renewal_date;

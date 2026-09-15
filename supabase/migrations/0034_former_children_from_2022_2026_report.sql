-- Beach Kids ERO Self-Audit Portal
-- Migration 0034: Former children from the 2022–2026 attendance history.
--
-- Source: Report_Children_Details_202609151035202723.pdf ("Child Details for
-- 1-Jan-2022 to 30-Sep-2026", Beach Kids Waihi) — every value below is
-- transcribed directly from that report (parsed programmatically from its
-- underlying text layout, not re-typed by hand, to avoid transcription
-- errors across ~180 rows). Ages are recorded here as of 2026-09-14, the
-- report's own generation date (from its PDF metadata) — the closest honest
-- anchor, matching how age_as_of has been set from every prior report.
--
-- This report lists every child who attended at any point in that window,
-- current and former alike. The 45 children currently active, plus 27
-- already on file with a "left" status (9 with a room from an earlier
-- active enrolment, 18 minimal profiles created automatically from
-- Accident & Illness photo imports), were matched by exact name and are
-- deliberately left untouched here — this migration only adds children who
-- do not exist in the system in any form yet, all with status = 'left'
-- (this report doesn't say precisely when each stopped attending, only
-- that they're not part of the current Sep 2026 active roster).
--
-- Bill payer emails are NOT included here. The report's "Bill Payer Email"
-- column is visually clipped in the PDF itself (confirmed by rendering a
-- page to an image, not just a text-extraction artifact) — recording a
-- truncated address as if it were complete would be worse than leaving it
-- blank. Any bill payer already on file keeps whatever email they already
-- have; new ones are added with no email, exactly like the original
-- 0019/0020 seed did before emails were confirmed and added in 0023.
--
-- Four names needed a judgement call and were confirmed with Ethan before
-- writing this migration, rather than guessed:
--   - "Kennedy O'Connell - Wharawhara" (report) is the same child as the
--     existing "Kennedy O'Connell-Wharawhara" (hyphen spacing only) — no
--     new profile added.
--   - "Mara Siega" (report) is the same child as the existing minimal
--     profile "Mara Seiga" (from an Accident & Illness photo import) —
--     confirmed the same child, but the two sources spell the surname
--     differently, so the existing profile's name is left as-is and
--     flagged in its notes for Ethan to confirm the correct spelling,
--     rather than guessed here.
--   - "Waiaria Tawhai" (report) is the same child as the existing
--     first-name-only profile "Waiaria" — confirmed, so that profile is
--     renamed/enriched below instead of creating a duplicate.
--   - "Ray McKenna" (report) is the same child as the existing placeholder
--     profile "Ray. M" — confirmed, so that profile is renamed/enriched
--     below. "Ray Sandhu" is a different child entirely (different
--     address/bill payer) and gets a brand new profile in the main insert.
--   - "Sia Rabab" (report) was confirmed to be the same child as the
--     currently ACTIVE "Rabab Jeph Sidhu" (identical age, shared name
--     element) — no new/duplicate profile added; the active profile is
--     just flagged in its notes for Ethan to double check the name.
--
-- A few addresses below end in "…" — that's exactly how they're truncated
-- in the source report, not a transcription error.
--
-- Run this in the Supabase SQL editor after 0019–0033, in order. Safe to
-- run more than once (bill payer inserts no-op on conflict; child inserts
-- are skipped for any name that already exists).

-- ---------------------------------------------------------------------------
-- New bill payers (name only — see note above on emails)
-- ---------------------------------------------------------------------------

insert into bill_payers (full_name) values
  ('Nadein Heemi'),
  ('Alex Manaoat'),
  ('Emily Smith'),
  ('Natasha Lane'),
  ('Winona Sharpe'),
  ('Elisha Macbeth'),
  ('Alka Nanglu'),
  ('Micah Appleton'),
  ('Sadé Hika'),
  ('Karl Jamieson'),
  ('Inge Van Maanen'),
  ('Sharni Dysart'),
  ('Adam Holt'),
  ('Kendall Brookes'),
  ('Ash Smyth'),
  ('Caitlin Geck'),
  ('Romsey de Beer'),
  ('Siobahn Soole'),
  ('Hayley Holland'),
  ('Rebecca Tinone'),
  ('Bonnie Fraser-Jones'),
  ('Nathan Duffull'),
  ('Georgeia Honey'),
  ('Abigail Arnst'),
  ('Gary Broomfield'),
  ('Rhyannon Cole'),
  ('Stefania Manna'),
  ('Shakelia Gates'),
  ('Janessa Grosenick'),
  ('Fatehdeep Manpreet Guswinder'),
  ('Eliza Whalley'),
  ('Laura Cathcart'),
  ('Kuljot Kaur'),
  ('Jimikah Tawhara'),
  ('Stacey White'),
  ('James Robinson'),
  ('Nina Williams'),
  ('Jean Eltringham'),
  ('Jess Grant'),
  ('Navjot Pandher'),
  ('Michelle Pearce'),
  ('Natalie Norman'),
  ('Dianne Christine'),
  ('Bianca Williams'),
  ('Vanessa May Dacoco'),
  ('Jasmeet Dhanjal'),
  ('Shirley Candelario'),
  ('Simon Fathers'),
  ('Anna Hansen Montes'),
  ('Natalie Pollard'),
  ('Rebecca Adlam'),
  ('Graeme Reid'),
  ('Chloe Clarke'),
  ('Anne Torrington'),
  ('Roseanna Marchant-Bullen'),
  ('Mel Crosbie'),
  ('Annie McKegg'),
  ('Manjot Chahal'),
  ('Mary Burke'),
  ('Sasha Mcgill-Turner'),
  ('Avon Matchitt'),
  ('Shane Dudek'),
  ('Bobby Pagadduj'),
  ('Sana Taloot'),
  ('Shirlee Bond'),
  ('Kaiya Meihana'),
  ('Jessica Crockett'),
  ('Aysha Wright'),
  ('Holly Goldsworthy - Smith'),
  ('rajwinder Kaur'),
  ('Maele Tuituiohu'),
  ('Irene Ellis'),
  ('Rikki Tawhara'),
  ('Tanieka Smith'),
  ('Shivangi Topiwala'),
  ('Rebecca Moore'),
  ('Mia Tihema-Neame'),
  ('Sera Potter'),
  ('Breanne McGillicky'),
  ('Kassie (KC) Sefton'),
  ('Rochelle Puga'),
  ('Saleshni Lata Ram'),
  ('Catherine Vehikite'),
  ('Ashleigh Masters'),
  ('Dorothy Ray'),
  ('Nikki Stevens'),
  ('Sheena Bennett'),
  ('Morgan Skelly'),
  ('Kat Lawrence'),
  ('Georgia Walker')
on conflict (full_name) do nothing;

-- ---------------------------------------------------------------------------
-- New former children (status = 'left') — everyone in the report who does
-- not already exist under this exact name, or under the confirmed
-- alternate-spelling matches noted above.
-- ---------------------------------------------------------------------------

insert into children (full_name, gender, age_years, age_months, age_as_of, residential_address, bill_payer_id, status)
select v.full_name, v.gender, v.age_years, v.age_months, date '2026-09-14', v.residential_address, bp.id, 'left'::child_status
from (values
  ('Aaliyah Heemi Awheto', 'Female', 4, 11, '64 Consols Street', 'Nadein Heemi'),
  ('Alexa Manaoat', 'Female', 7, 2, '5 Magnolia Lane', 'Alex Manaoat'),
  ('Alfie Smith', 'Male', 6, 2, '37 Galbraith Street', 'Emily Smith'),
  ('Alison Papps', 'Female', 7, 1, '7 Mackay Street', 'Natasha Lane'),
  ('Amara Sharpe', 'Female', 8, 7, '33 Princes Street', 'Winona Sharpe'),
  ('Amelia Rhodes', 'Female', 6, 1, '11 Somerset Street', 'Elisha Macbeth'),
  ('Amritveer Kaur', 'Female', 6, 1, 'Waihi', 'Alka Nanglu'),
  ('Arhniya Heemi Awheto', 'Female', 6, 4, '64 Consols Street', 'Nadein Heemi'),
  ('Ari Appleton', 'Male', 6, 1, '18 Brighton Road', 'Micah Appleton'),
  ('Aria Tamihere', 'Female', 4, 2, '10 Moresby Avenue', 'Sadé Hika'),
  ('Astra Jamieson', 'Female', 6, 10, '18a Moresby Avenue', 'Karl Jamieson'),
  ('Ayla Leslie', 'Female', 8, 8, '30 Gladstone Road', 'Inge Van Maanen'),
  ('Beau Dysart', 'Male', 8, 4, '26a Evans Street Waihi 3610', 'Sharni Dysart'),
  ('Billie-Rose Evans', 'Female', 7, 4, '32 Moresby Avenue', 'Adam Holt'),
  ('Blake Gernhoefer', 'Female', 6, 1, '24 Mayor View Terrace', 'Kendall Brookes'),
  ('Blake Sharland', 'Female', 6, 7, '1158c Waihi Whangamata Road …', 'Ash Smyth'),
  ('Blayney Leighland John', 'Male', 6, 0, '45 Bradford Street', 'Caitlin Geck'),
  ('Bodhi De Beer', 'Male', 5, 5, '16 Athenree Road, Athenree.', 'Romsey de Beer'),
  ('Brody Snodgrass', 'Male', 8, 4, '30 Sandleigh Drive Rd 1 Athenr …', 'Siobahn Soole'),
  ('Carter Holland', 'Male', 6, 3, '12 Queen Street', 'Hayley Holland'),
  ('Cayde Bowden', 'Male', 7, 0, '7 Rukumoana Road', 'Rebecca Tinone'),
  ('Cherish Keleher', 'Female', 3, 2, '133 Bradford Street', 'Bonnie Fraser-Jones'),
  ('Curtis Duffull', 'Male', 5, 6, '54 Parry Palm Avenue', 'Nathan Duffull'),
  ('Dakotah Rudolph', 'Male', 5, 10, '7 Park Lane', 'Georgeia Honey'),
  ('Diedrich Harris', 'Male', 5, 8, '32B Dillon Street', 'Abigail Arnst'),
  ('Edward Broomfield', 'Male', 5, 4, '34 Tauranga Road', 'Gary Broomfield'),
  ('Eli Follas', 'Male', 6, 5, '2 The Esplanade', 'Rhyannon Cole'),
  ('Elijah Finucane', 'Male', 3, 6, '183 Kauri Point Road', 'Stefania Manna'),
  ('Elijah Gates', 'Male', 5, 5, '128 Ford Road', 'Shakelia Gates'),
  ('Elijah Sharpe', 'Male', 6, 4, '96 Kenny Street', 'Winona Sharpe'),
  ('Emerson St Jules', 'Male', 6, 1, '3 Elliot Street', 'Janessa Grosenick'),
  ('Fatehdeep Manpreet', 'Female', 4, 5, '842 Waihi Whangamata Road', 'Fatehdeep Manpreet Guswinder'),
  ('Freya Hoyle', 'Female', 6, 6, '11 Fleet Street', 'Eliza Whalley'),
  ('George Papps', 'Male', 5, 8, '7 MacKay Street', 'Natasha Lane'),
  ('Harlow Gifford Hughes', 'Female', 5, 2, '72 Taieri Road', 'Laura Cathcart'),
  ('Harneet Kaur', 'Female', 8, 3, '8 Hobson Street', 'Kuljot Kaur'),
  ('Harper Tenni', 'Female', 7, 2, '2 Princes Street', 'Jimikah Tawhara'),
  ('Harper White', 'Female', 7, 3, '59 Gladstone Road', 'Stacey White'),
  ('Haylan Robinson', 'Male', 3, 2, '64 Waitete Road', 'James Robinson'),
  ('Hudson Bryant', 'Male', 2, 2, '22 Silverton Road', 'Nina Williams'),
  ('Hudson Lockley', 'Male', 4, 3, '9 Islington Terrace', 'Jean Eltringham'),
  ('Hugo Foster', 'Male', 7, 4, '15 Richmal Street', 'Jess Grant'),
  ('Ira Kaur Sandhu', 'Female', 7, 10, '10 Johnston Street', 'Navjot Pandher'),
  ('Isla Harley', 'Female', 7, 10, '55 Moresby Avenue', 'Michelle Pearce'),
  ('Isla Probert', 'Female', 8, 8, '14 Reo Crescent', 'Natalie Norman'),
  ('Ivy Appleton', 'Female', 6, 1, '18 Brighton Road', 'Micah Appleton'),
  ('Jack McAnelly Innes', 'Male', 3, 0, '45 Bradford Street', 'Caitlin Geck'),
  ('Jadyn Hodson', 'Male', 6, 3, '21 Princes Street', 'Dianne Christine'),
  ('Jax Keatley', 'Female', 5, 2, '15 Christensen Street', 'Bianca Williams'),
  ('Jessica Zaportiza', 'Female', 4, 5, '95 Trig Road North', 'Vanessa May Dacoco'),
  ('Jolyn Sokhi', 'Female', 7, 7, '2 Wenlock Street', 'Jasmeet Dhanjal'),
  ('Kai Candelario', 'Female', 4, 7, '83 Kenny Street', 'Shirley Candelario'),
  ('Kai Fathers', 'Male', 5, 7, '40 Mayor View Terrace', 'Simon Fathers'),
  ('Kaia O''Hara', 'Female', 5, 5, '21 Leo Street', 'Anna Hansen Montes'),
  ('Kamryn Fathers', 'Female', 4, 5, '40 Mayor View Terrace', 'Simon Fathers'),
  ('Kyle Pollard', 'Male', 8, 9, '25a Moresby Avenue', 'Natalie Pollard'),
  ('Lacey Ellis', 'Female', 5, 0, '372 Golden Valley Road Rd 1', 'Rebecca Adlam'),
  ('Lance Reid', 'Male', 8, 2, '1 Islington Terrace', 'Graeme Reid'),
  ('Lewis Dando Clarke', 'Male', 8, 10, '17 Silverton Road', 'Chloe Clarke'),
  ('Louis Torrington', 'Male', 7, 6, '45 Mataura Road', 'Anne Torrington'),
  ('Louka Marchant-Bullen', 'Male', 5, 2, '28a Tauranga Road', 'Roseanna Marchant-Bullen'),
  ('Lulu Lee', 'Female', 4, 0, '42 Longmynd Drive', 'Mel Crosbie'),
  ('Mackenzie Ellender', 'Female', 5, 7, '179 Waihi Beach Road Rd 1', 'Annie McKegg'),
  ('Madhan Chahal', 'Male', 7, 10, '233 Tanners Point Road Rd 1 Ta…', 'Manjot Chahal'),
  ('Maelie Burke', 'Female', 4, 2, '14 Albert Street', 'Mary Burke'),
  ('Malia Ahomiro Wilson', 'Female', 3, 9, '59 Seaforth Road', 'Sasha Mcgill-Turner'),
  ('Margot Gernhoefer', 'Female', 2, 10, '24 Mayor View Terrace', 'Kendall Brookes'),
  ('Marino Tawhai', 'Male', 1, 9, '6B Queen Street', 'Avon Matchitt'),
  ('Max Bowles', 'Male', 5, 5, '8 Thomas Place', 'Shane Dudek'),
  ('Meir Kevin Pagadduj', 'Male', 7, 6, '895 State Highway 2', 'Bobby Pagadduj'),
  ('Merab Taloot', 'Female', 5, 9, '259 Seaforth Road', 'Sana Taloot'),
  ('Micha Bond', 'Male', 2, 7, '26 Tohora View', 'Shirlee Bond'),
  ('Ngaire Hika', 'Female', 6, 2, '10 Moresby Avenue', 'Sadé Hika'),
  ('Nixen Spargo', 'Male', 8, 2, '38 Kingsley Road', 'Kaiya Meihana'),
  ('Noah Crockett', 'Male', 7, 9, '697 Woodlands Road Rd 2', 'Jessica Crockett'),
  ('Oaken Hoyle', 'Male', 7, 10, '11 Fleet Street', 'Eliza Whalley'),
  ('Olive Wright', 'Female', 8, 4, '404 Waitawheta Road Rd 2', 'Aysha Wright'),
  ('Opie Goldsworthy-Smith', 'Male', 4, 10, '33 Adams Street', 'Holly Goldsworthy - Smith'),
  ('Param Singh', 'Male', 6, 6, '32 Union Street', 'rajwinder Kaur'),
  ('Paula Tuituiohu', 'Male', 5, 10, '24a Kenny Street', 'Maele Tuituiohu'),
  ('Phoenix Ellis', 'Male', 7, 1, '42 Parry Palm Avenue', 'Irene Ellis'),
  ('Phoenix-Lee Jackson', 'Male', 6, 2, '236 Edinburgh Street', 'Rikki Tawhara'),
  ('Raffi Smith', 'Male', 6, 1, '25 Amaranth Street', 'Tanieka Smith'),
  ('Ray Sandhu', 'Male', 5, 11, '10 Johnston Street', 'Navjot Pandher'),
  ('Raya Jamnadas', 'Female', 7, 3, '19 Albert Street', 'Shivangi Topiwala'),
  ('Rita Moore', 'Female', 7, 1, '6b Karamu Place', 'Rebecca Moore'),
  ('Robert Cave', 'Male', 7, 1, '10 Athenree Heights Rd 1 Athen …', 'Mia Tihema-Neame'),
  ('Romeo Potter', 'Male', 8, 6, '36 Thorn Road', 'Sera Potter'),
  ('Rose McGillicky-Measures', 'Female', 5, 5, '26a Evans Street', 'Breanne McGillicky'),
  ('Ruby Sefton', 'Female', 7, 0, '23 Regent Street', 'Kassie (KC) Sefton'),
  ('Sabrina Bowles', 'Female', 3, 11, '8 Thomas Place', 'Shane Dudek'),
  ('Seth Puga', 'Male', 3, 8, '24A Whitaker Street', 'Rochelle Puga'),
  ('shalron Chand', 'Female', 7, 7, '8 Boundary Road', 'Saleshni Lata Ram'),
  ('Sione Vehikite', 'Male', 4, 0, '14 Princes St', 'Catherine Vehikite'),
  ('Sophie Walker', 'Female', 6, 8, '14a Waitete Road', 'Ashleigh Masters'),
  ('Stanisha Kuni', 'Female', 6, 4, '29A MacKay Street', 'Dorothy Ray'),
  ('Stanley Stevens', 'Male', 7, 7, '38 Johnston Street', 'Nikki Stevens'),
  ('Suus Leslie', 'Female', 6, 10, '30 Gladstone Road', 'Inge Van Maanen'),
  ('Taiaha Tati Bennett', 'Male', 3, 4, '21 Princes Street', 'Sheena Bennett'),
  ('Talia Murphy', 'Female', 6, 3, '5 Kea Street', 'Morgan Skelly'),
  ('Taye Foster', 'Male', 2, 11, '15 Richmal Street', 'Jess Grant'),
  ('Tejay Gifford', 'Male', 5, 1, '72 Taieri Road', 'Laura Cathcart'),
  ('Tommie Lawrence', 'Female', 6, 8, '48 Gladstone Road', 'Kat Lawrence'),
  ('Willow Sutton', 'Female', 5, 8, '61 Gladstone Road', 'Georgia Walker'),
  ('Zafira Puga', 'Female', 6, 10, '24A Whitaker Street', 'Rochelle Puga'),
  ('Jordan Tuituiohu', 'Male', 6, 10, '24a Kenny Street', 'Maele Tuituiohu')
) as v(full_name, gender, age_years, age_months, residential_address, bill_payer_name)
left join bill_payers bp on bp.full_name = v.bill_payer_name
where not exists (select 1 from children c where c.full_name = v.full_name);

-- ---------------------------------------------------------------------------
-- Enrich the three existing minimal/placeholder profiles that this report
-- confirmed are real children, rather than creating duplicates for them.
-- Each is only updated if it's still in its original placeholder state
-- (age not set), so re-running this migration never overwrites anything
-- Ethan has since filled in by hand.
-- ---------------------------------------------------------------------------

insert into bill_payers (full_name) values
  ('Haruko McKenna'),
  ('Rose Siega')
on conflict (full_name) do nothing;

-- "Ray. M" -> Ray McKenna
update children set
  full_name = 'Ray McKenna',
  gender = 'Male',
  age_years = 5,
  age_months = 2,
  age_as_of = date '2026-09-14',
  residential_address = '64b Gladstone Road',
  bill_payer_id = (select id from bill_payers where full_name = 'Haruko McKenna'),
  notes = coalesce(notes || E'\n\n', '') || 'Name completed from the 1-Jan-2022 to 30-Sep-2026 attendance report — was previously on file as the placeholder "Ray. M" from an Accident & Illness photo import.'
where full_name = 'Ray. M' and age_years is null;

-- "Waiaria" -> Waiaria Tawhai
update children set
  full_name = 'Waiaria Tawhai',
  gender = 'Female',
  age_years = 3,
  age_months = 3,
  age_as_of = date '2026-09-14',
  residential_address = '6B Queen Street',
  bill_payer_id = (select id from bill_payers where full_name = 'Avon Matchitt'),
  notes = coalesce(notes || E'\n\n', '') || 'Surname completed from the 1-Jan-2022 to 30-Sep-2026 attendance report — was previously on file as just "Waiaria" from an Accident & Illness photo import.'
where full_name = 'Waiaria' and age_years is null;

-- "Mara Seiga" — confirmed the same child as this report's "Mara Siega",
-- but the surname is spelled differently in each source, so the name
-- itself is left as-is here rather than guessed; flagged in notes instead.
update children set
  gender = 'Female',
  age_years = 5,
  age_months = 11,
  age_as_of = date '2026-09-14',
  residential_address = '45 Roberts Street',
  bill_payer_id = (select id from bill_payers where full_name = 'Rose Siega'),
  notes = coalesce(notes || E'\n\n', '') || 'The 1-Jan-2022 to 30-Sep-2026 attendance report spells this child''s surname "Siega" (this profile has it as "Seiga", from an Accident & Illness photo import) — same child, confirmed with Ethan; please confirm the correct spelling and update the name if needed.'
where full_name = 'Mara Seiga' and age_years is null;

-- Rabab Jeph Sidhu (currently active) — flagged only, nothing else changed.
update children set
  notes = coalesce(notes || E'\n\n', '') || 'The 1-Jan-2022 to 30-Sep-2026 attendance report lists a child "Sia Rabab" (same age: 1y 10m) — confirmed with Ethan to be this same child. Name kept as-is here; flagging in case the roll name needs updating.'
where full_name = 'Rabab Jeph Sidhu' and (notes is null or notes not like '%Sia Rabab%');

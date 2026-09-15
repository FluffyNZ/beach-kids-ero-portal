-- Beach Kids ERO Self-Audit Portal
-- Migration 0023: Children Details refresh from the real Sep 2026 report.
--
-- Source: Report_Children_Details_202609081250570212.pdf ("Child Details
-- for 1-Sep-2026 to 30-Sep-2026", Beach Kids Waihi) — every value below is
-- transcribed directly from that PDF (parsed programmatically from its
-- underlying text layout, not re-typed by hand, to avoid transcription
-- errors across 53 rows). Ages are recorded here as of 2026-09-01, the
-- start of the report's period — the PDF doesn't give an exact "as of"
-- date, so this is the closest honest anchor and matches how age_as_of
-- was set from the previous (August) report in 0020.
--
-- Three columns are new on children: gender, residential_address, and
-- primary_contact_email (the report's "PC 1 Email" — the family's primary
-- contact, which is sometimes a different person from the bill payer).
--
-- Kingston O'Connell - Wharawhara is not in this report (he no longer
-- attends, consistent with his "left" status) and is left untouched here.
--
-- IMPORTANT — two things this migration deliberately does NOT "fix":
--
-- 1. Cecelia Carnachan is currently linked to the same bill payer record
--    ("Rachel Carnachan") as Hudson and Toby Carnachan, on the assumption
--    from the original Aug fees report that shared the surname. This PDF
--    gives Hudson and Toby's bill payer email as alan.carolyn@gmail.com,
--    but Cecelia's as kzrdhd@msn.com — a different email entirely, seen
--    nowhere else in this report. That's a real signal she may have a
--    different bill payer despite the shared surname, which would also
--    mean she shouldn't currently be counted toward Hudson/Toby's sibling
--    discount (or vice versa). Rather than guess which is right, this
--    migration leaves Cecelia's bill_payer_id and the Rachel Carnachan
--    record's email untouched — flagged for Ethan to confirm.
--
-- 2. Stephanie Dykstra (bill payer for Tate and Ella Mcbirney) has two
--    near-identical emails in the report: Tate's row shows
--    Stephanie.dykstra94@hotmail.com, Ella's shows
--    tephanie.dylestra94@hotmail.com (missing the leading S, and
--    "dylestra" vs "dykstra") — almost certainly the same person with a
--    typo somewhere in the centre's own records, not two different
--    people. This migration updates the bill_payers record with the
--    cleanly-spelled version from Tate's row; Ella's own
--    primary_contact_email is still recorded exactly as the report has
--    it (typo and all), since that's a direct transcription of her row,
--    not a shared bill-payer field.
--
-- Run this in the Supabase SQL editor after 0019–0022, in order.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

alter table children add column if not exists gender text;
alter table children add column if not exists residential_address text;
alter table children add column if not exists primary_contact_email text;

-- ---------------------------------------------------------------------------
-- Existing children: gender / age / address / primary contact refresh
-- ---------------------------------------------------------------------------

update children as c set
  gender = v.gender,
  age_years = v.age_years,
  age_months = v.age_months,
  age_as_of = date '2026-09-01',
  residential_address = v.residential_address,
  primary_contact_email = nullif(v.primary_contact_email, '')
from (values
  ('Amroz Kaur Nehal', 'Female', 1, 8, '11A MacKay Street', 'jasdeepnehal1988@gmail.com'),
  ('Archie Young', 'Male', 1, 6, '65 Savage Road', 'cameron.young@police.govt.nz'),
  ('Freya Singleton Wilson', 'Female', 1, 1, '50 Gladstone Road', 'hare.t.wilson@gmail.com'),
  ('Hudson Carnachan', 'Male', 0, 10, '12 Donnelly Street', 'kzrdhd@msn.com'),
  ('Isabelle Higgins', 'Female', 1, 11, '7 Pickett Place', 'craigrosshiggins75@gmail.com'),
  ('Koa Iti', 'Male', 1, 10, '10 Moresby Avenue', 'itimason3@gmail.com'),
  ('Layla Paul', 'Female', 1, 11, '34A Waitete Road', 'boytwetere@gmail.com'),
  ('Luca Williams', 'Male', 0, 11, '23B Edinburgh Street', 'Nyahfrew@gmail.com'),
  ('Maria Scheer', 'Female', 1, 4, '1 King Street', 'nitaambrown@gmail.com'),
  ('McKenize Singh Savage', 'Female', 1, 7, '5 Regent Street', 'd06582707@gmail.com'),
  ('Micah Murray', 'Male', 2, 4, '342 Pukekauri Road', 'jimikah@live.com.au'),
  ('Ryder Milanesi', 'Female', 2, 0, '94 Barry Road', 'madisonh821@gmail.com'),
  ('Sean Lu', 'Male', 1, 11, '27a Kitchener Street', 'alison9222@hotmail.com'),
  ('Toby Carnachan', 'Male', 1, 11, '12 Donnelly Street', 'kzrdhd@msn.com'),
  ('Violet Groenestein', 'Female', 0, 11, '65 Willows Road', 'goldvalleytyres@gmail.com'),
  ('Aneila Williams', 'Female', 2, 6, '29 Consols Street', 'Nyahfrew@gmail.com'),
  ('Aura Ormsby', 'Female', 2, 3, '35 Mueller Street', 'oshannawakelin@outlook.com'),
  ('Ava McPherson', 'Female', 2, 11, '81 Barry Road', 'rllenel@yahoo.co.nz'),
  ('Brandon Wallace', 'Male', 3, 5, '12B Riverlea Drive', 'hire.emslawnmowingservice@hotmail.com'),
  ('Cecelia Carnachan', 'Female', 3, 1, '12 Donnelly Street', 'kzrdhd@msn.com'),
  ('Daisy Stroobant', 'Female', 2, 4, '65 Willows Road', 'samanthastroobant@gmail.com'),
  ('Esme Frauendorf', 'Female', 3, 0, '75 Kensington Road', ''),
  ('Finn Keatley', 'Male', 3, 4, '15 Christensen Street', ''),
  ('Gray Spargo', 'Male', 2, 4, '76 Dillon Street', 'georgiakainamu14@gmail.com'),
  ('Indica Bidois', 'Female', 3, 0, '10 Tauranga Road', 'bidoisdavid71@gmail.com'),
  ('Isla McPherson', 'Female', 2, 11, '81 Barry Road', 'rllenel@yahoo.co.nz'),
  ('James Measures', 'Male', 3, 0, '24 Hillview Road', ''),
  ('Kyrie Turnbull', 'Male', 3, 1, '23B Shaw Road', 'kristinaaron@xtra.co.nz'),
  ('Ruiha Tamihere', 'Female', 2, 5, '12 Rata Street', 'mariegudsell67@gmail.com'),
  ('Tate Mcbirney', 'Male', 2, 6, '1 Karamu Place', 'avidmcbirney774@gmail.com'),
  ('Tatum Matich', 'Male', 3, 3, '3 Banks Street', 'ashleepw8@gmail.com'),
  ('Vardaan Singh Nehal', 'Male', 3, 5, '11A MacKay Street', 'jasdeepnehal1988@gmail.com'),
  ('Will Chen', 'Male', 3, 9, '27a Kitchener Street', 'alison9222@hotmail.com'),
  ('Amelia Claire Broomfield', 'Female', 4, 1, '34 Tauranga Road', 'natasha-h@hotmail.co.nz'),
  ('Aaliyah De Bruin', 'Female', 3, 8, '140 Heard Road', 'srspittal@outlook.co.nz'),
  ('Aria Murray', 'Female', 4, 3, '342 Pukekauri Road', 'jimikah@live.com.au'),
  ('Aterea Johns', 'Male', 4, 11, '1 King Street', 'nitaambrown@gmail.com'),
  ('Ella Mcbirney', 'Female', 4, 4, '1 Karamu Place', 'tephanie.dylestra94@hotmail.com'),
  ('Harlem Tangira-Paul', 'Male', 5, 1, '21 Kenny Street', 'avlonpaul72@gmail.com'),
  ('Ihorei Wall-Church', 'Male', 3, 8, '36B Lawrence Road', 'wall.wairau@gmail.com'),
  ('Kaabil Singh', 'Male', 4, 5, '21122 Kenny Street', 'jaspreet.gill87@yahoo.com'),
  ('Kenny Choat', 'Male', 4, 7, '341 Old Tauranga Road Rd 2', 'kickfarmsltd@gmail.com'),
  ('Kora Milanesi', 'Female', 4, 2, '124a Kenny Street', 'madisonh821@gmail.com'),
  ('Oliver Obeda', 'Male', 5, 3, '35B Galbraith Street', 'freespirits2015@gmail.com'),
  ('Phoenix Cox', 'Male', 4, 1, '59 Hollis Road', 'dcfabrication59@outlook.com'),
  ('Princedeep Singh Savage', 'Male', 4, 2, '5 Regent Street', 'd06582707@gmail.com'),
  ('Roman Oakley', 'Male', 4, 3, '15C Hobson Street', 'ahsiela_93@hotmail.com'),
  ('Samuel Higgins', 'Male', 4, 10, '7 Pickett Place', 'Craigrosshiggins75@gmail.com'),
  ('Zac Jensen', 'Male', 3, 11, '126 Trig Road South', 'Jesse.jensen.2323@gmail.com')
) as v(full_name, gender, age_years, age_months, residential_address, primary_contact_email)
where c.full_name = v.full_name;

-- ---------------------------------------------------------------------------
-- Bill payer email refresh — every payer EXCEPT Rachel Carnachan (see the
-- note above; her email is left as whatever it already was).
-- ---------------------------------------------------------------------------

update bill_payers as bp set email = v.email
from (values
  ('Aleisha Oakley', 'ahsiela_93@hotmail.com'),
  ('Alison Lu', 'alison9222@hotmail.com'),
  ('Ashlee McCarthy', 'ashleepw8@gmail.com'),
  ('Ashleigh Wilson', 'ashleighwilson148@gmail.com'),
  ('Avalon Paul', 'avlonpaul72@gmail.com'),
  ('Aysha Singleton', 'aysha000567@gmail.com'),
  ('Bianca Williams', 'bianca.williams@ngatea.school.nz'),
  ('Chris Scheer', 'nitaambrown@gmail.com'),
  ('Craig Higgins', 'craigrosshiggins75@gmail.com'),
  ('Daniele Savage', 'd06582707@gmail.com'),
  ('Georgia Kainamu', 'georgiakainamu14@gmail.com'),
  ('Harpreet Kaur', 'pharpreet25@yahoo.in'),
  ('Heather Stuart-Wallace', 'heatherstuart1987@hotmail.com'),
  ('Jasdeep Singh', 'jasdeepnehal1988@gmail.com'),
  ('Jaspreet kaur', 'jaspreet.gill87@yahoo.com'),
  ('Jimikah Tawhara', 'jimikah@live.com.au'),
  ('Juanita Brown', 'nitaambrown@gmail.com'),
  ('Katelyn Tamihere', 'Kruihatamihere@gmail.com'),
  ('Kaylea Choat', 'kickfarmsltd@gmail.com'),
  ('Llenel Reynolds', 'rllenel@yahoo.co.nz'),
  ('Louise Young', 'loukyoung863@gmail.com'),
  ('Madison Hall', 'madisonh821@gmail.com'),
  ('Maxine Paul', 'boytwetere@gmail.com'),
  ('Myah Robins', 'myahrobins@gmail.com'),
  ('Nyah Frew', 'Nyahfrew@gmail.com'),
  ('Oshanna Wakelin', 'oshannawakelin@outlook.com'),
  ('Quest Frost', 'questfrost01@gmail.com'),
  ('Rebecca Higgins', 'Rebeccamhiggins75@gmail.com'),
  ('Rebekah Bird', 'freespirits2015@gmail.com'),
  ('Samantha Stroobant', 'samanthastroobant@gmail.com'),
  ('Shelley Frauendorf', 'Shelleyfrauendorf@gmail.com'),
  ('Stephanie Dykstra', 'Stephanie.dykstra94@hotmail.com'),
  ('Stevie Iti', 'itimason3@gmail.com'),
  ('Summer Spittal', 'srspittal@outlook.co.nz'),
  ('Wairau Wall', 'wall.wairau@gmail.com'),
  ('William Ross', 'billcoxnz@gmail.com')
) as v(full_name, email)
where bp.full_name = v.full_name;

-- ---------------------------------------------------------------------------
-- New children — previously excluded from 0020 because the source fees
-- report only flagged that they exist, without age/room/bill payer. This
-- report has enough to add them properly now, except a named bill payer
-- (only their billing contact's email address is given) and a room
-- (not in this report at all) — both flagged via the existing
-- "unlisted"/notes mechanism rather than guessed.
-- ---------------------------------------------------------------------------

insert into children (full_name, gender, age_years, age_months, age_as_of, residential_address, primary_contact_email, room_notes, bill_payer_unlisted_note, status)
select v.full_name, v.gender, v.age_years, v.age_months, date '2026-09-01', v.residential_address, nullif(v.primary_contact_email, ''), v.room_notes, v.bill_payer_unlisted_note, 'active'::child_status
from (values
  ('Keonna Cerna', 'Female', 2, 3, '337 Pukewera Rd', 'joeycerna83@yahoo.com', 'Room not yet confirmed — pending enrolment details', 'Bill payer not yet named — billing contact email on file: kmcerna0023@gmail.com'),
  ('Lyla Seymour', 'Female', 0, 5, '22 Waitete Road', 'ethanseenomore@gmail.com', 'Room not yet confirmed — pending enrolment details', 'Bill payer not yet named — billing contact email on file: korrina.lindsey@outlook.co.nz'),
  ('Sia Rabab', 'Female', 1, 10, '96 Old Tauranga Road', 'pooja21jeph@gmail.com', 'Room not yet confirmed — pending enrolment details', 'Bill payer not yet named — billing contact email on file: jitu.sandy786@gmail.com'),
  ('Tūī Percy', 'Female', 4, 1, '133 Consols Street', 'maramajewellery.cj@gmail.com', 'Room not yet confirmed — pending enrolment details', 'Bill payer not yet named — billing contact email on file: maramajewellery.cj@gmail.com')
) as v(full_name, gender, age_years, age_months, residential_address, primary_contact_email, room_notes, bill_payer_unlisted_note)
where not exists (select 1 from children c where c.full_name = v.full_name);

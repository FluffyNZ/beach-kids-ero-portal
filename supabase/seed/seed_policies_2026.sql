-- Beach Kids Policy Review Calendar 2026 — seeds the Policies register with
-- the 16 policies from the review calendar as shell records (title,
-- category, review cycle, next review date). No documents are attached yet
-- — upload each policy's actual document afterwards from its detail page
-- via "Add new version", then Approve it to make it current.
--
-- Run this in the Supabase SQL editor AFTER 0004_policies.sql has been
-- applied. Safe to run once; running it twice will create duplicate rows
-- (there's no unique constraint on title), so don't paste it in twice.

insert into policies (title, category, review_cycle, next_review_date) values
  ('Safety checking procedure', 'Governance, Management & Administration', 'three_yearly', '2027-02-01'),
  ('Premises and facilities policy', 'Premises & Facilities', 'three_yearly', '2028-02-01'),
  ('Partnership with whānau and aspirations policy', 'Curriculum', 'annual', '2026-03-01'),
  ('Developing social competence policy', 'Curriculum', 'biannual', '2026-03-01'),
  ('Child health and wellbeing policy', 'Health & Safety', 'annual', '2026-04-01'),
  ('Assessment, planning and evaluation procedure', 'Curriculum', 'biannual', '2027-04-01'),
  ('Bicultural Policy', 'Curriculum', 'annual', '2026-05-01'),
  ('Human resource management policy', 'Governance, Management & Administration', 'biannual', '2026-05-01'),
  ('Child protection policy', 'Health & Safety', 'annual', '2026-06-01'),
  ('Professional practice policy', 'Governance, Management & Administration', 'annual', '2026-07-01'),
  ('Food, drink, and bottle policy', 'Health & Safety', 'biannual', '2027-07-01'),
  ('Hazard management policy', 'Health & Safety', 'annual', '2026-08-01'),
  ('Emergency management plan', 'Health & Safety', 'annual', '2026-09-01'),
  ('Hygiene policy', 'Health & Safety', 'annual', '2026-10-01'),
  ('Parent involvement and information procedure', 'Governance, Management & Administration', 'annual', '2026-11-01'),
  ('Excursion policy', 'Health & Safety', 'three_yearly', '2026-11-01');

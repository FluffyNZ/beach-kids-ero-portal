-- 20 Hours ECE eligibility is a government subsidy every child gets from
-- age 3 (capped at 6 hours/day, already the ece_daily_max_hours default) —
-- not a manual per-child toggle. The app now derives this from age_years
-- everywhere it matters, but a few places (e.g. the "20 Hrs" badge on the
-- children list) still read the stored twenty_hours_ece column directly,
-- so sync it here for every existing child.
update children
set twenty_hours_ece = (age_years is not null and age_years >= 3)
where twenty_hours_ece is distinct from (age_years is not null and age_years >= 3);

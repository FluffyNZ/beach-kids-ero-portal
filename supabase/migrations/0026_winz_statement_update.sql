-- Real WINZ (Work and Income) Child Care Provider Statement, week beginning
-- 31/08/26 — sets each child's actual weekly WINZ subsidy (payment, CCA
-- hours, caregiver name, renewal date) from that statement, replacing
-- whatever placeholder/estimated values were on file before.

-- "Sia Rabab" was added from an earlier report with an incomplete name.
-- The WINZ statement gives her real full name: Rabab Jeph Sidhu.
update children
set full_name = 'Rabab Jeph Sidhu'
where full_name = 'Sia Rabab';

insert into child_winz_subsidies (child_id, caregiver_name, weekly_cca_hours, weekly_payment, renewal_date, notes)
select ch.id, v.caregiver_name, v.weekly_cca_hours, v.weekly_payment, v.renewal_date::date, v.notes
from (
  values
    ('Indica Bidois', 'Myah Maree Robins', 9, 60.48, '2026-12-21', null),
    ('Micah Murray', 'Kyha Lathanual Murray', 14, 94.08, '2027-05-03', null),
    ('Luca Williams', 'Nyah Rae Frew', 12, 67.50, '2027-05-17', null),
    ('Keonna Cerna', 'Kristine Cerne', 9, 48.24, '2027-08-16',
      'Also received a one-off arrears payment of $96.48 for 10-21 Aug 2026, paid 31/08/26.'),
    ('Ryder Milanesi', 'Madison Ella Hall', 7, 20.00, '2027-04-05', null),
    ('Rabab Jeph Sidhu', 'Jitender Singh', 9, 60.48, '2027-08-23', null),
    ('Brandon Wallace', 'Heather Alexandria Stuart', 18, 120.96, '2026-10-05', null),
    ('Aaliyah De Bruin', 'Summer Spittal', 10, 67.20, '2026-11-23', null),
    ('Isabelle Higgins', 'Rebecca Maree Higgins', 33, 123.75, '2027-05-17', null),
    ('Samuel Higgins', 'Rebecca Maree Higgins', 13, 48.75, '2027-05-17', null),
    ('Ava McPherson', 'Llenel Reynolds', 9, 60.48, '2027-04-19', null),
    ('Isla McPherson', 'Llenel Reynolds', 9, 60.48, '2027-04-19', null),
    ('Princedeep Singh Savage', 'Daniele Katarina Savage', 4, 26.88, '2027-02-22', null),
    ('Daisy Stroobant', 'Samantha Stroobant', 40, 268.80, '2027-03-15', null),
    ('Ruiha Tamihere', 'Katelyn Ruiha Ann Tamihere', 9, 60.48, '2026-09-07',
      'Renewal date on the statement had already passed as of the statement date — check if this has since been renewed.'),
    ('Kyrie Turnbull', 'Quest T H C Frost', 9, 60.48, '2027-03-01', null)
) as v(full_name, caregiver_name, weekly_cca_hours, weekly_payment, renewal_date, notes)
join children ch on ch.full_name = v.full_name
on conflict (child_id) do update set
  caregiver_name = excluded.caregiver_name,
  weekly_cca_hours = excluded.weekly_cca_hours,
  weekly_payment = excluded.weekly_payment,
  renewal_date = excluded.renewal_date,
  notes = excluded.notes,
  updated_at = now();

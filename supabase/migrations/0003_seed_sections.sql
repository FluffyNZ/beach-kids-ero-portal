-- Beach Kids ERO Self-Audit Portal
-- Migration 0003: seed the four fixed ERO audit sections.
-- These four category names/codes are given directly by Beach Kids
-- management and mirror the ERO Self-Audit Checklists structure. Individual
-- criteria (C1, PF1, HS1, GMA1 …) are NOT seeded here — see
-- supabase/seed/README.md for why, and supabase/seed/seed_criteria.sql
-- once the source document has been processed.

insert into ero_sections (code, name, description, sort_order) values
  ('C', 'Curriculum', 'ERO self-audit criteria relating to curriculum, teaching and learning.', 1),
  ('PF', 'Premises and Facilities', 'ERO self-audit criteria relating to premises, facilities and the physical environment.', 2),
  ('HS', 'Health and Safety', 'ERO self-audit criteria relating to health, safety and wellbeing.', 3),
  ('GMA', 'Governance, Management and Administration', 'ERO self-audit criteria relating to governance, management and administration.', 4)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

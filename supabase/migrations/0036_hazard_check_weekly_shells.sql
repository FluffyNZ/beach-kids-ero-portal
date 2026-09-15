-- Beach Kids ERO Self-Audit Portal
-- Migration 0036: Blank weekly hazard check shells, start of 2026 to now.
--
-- Requested by Ethan: create the empty weekly hazard chart for every room
-- that has a checklist template, for every week from the start of this
-- year up to now, so staff have somewhere real to fill in and sign as they
-- go, instead of clicking "Start a check" by hand for every past week.
--
-- IMPORTANT — this migration creates STRUCTURE ONLY, nothing else:
--   - Every checklist item is inserted unchecked (is_checked = false).
--   - No hazard log entries are created — the Hazard Register stays empty
--     until a real hazard is actually logged.
--   - Every daily sign-off (Monday–Friday of each week) is created with no
--     staff, no time, and signed_off = false.
--   - No evidence photo is attached.
-- Nothing here claims a check was actually done, by anyone, on any day.
-- That's deliberate: Ethan asked for the blank scaffolding to work through
-- himself (or upload real evidence for) — not a fabricated history. See
-- the standing rule against inventing Beach Kids records, discussed with
-- Ethan directly before writing this migration.
--
-- Weeks run from the Monday of the week containing 1 January 2026
-- (2025-12-29, since Jan 1 2026 is a Thursday) through the Monday of the
-- current week (CURRENT_DATE at the time this is run) — so running this
-- again later naturally extends the shells up to whatever "now" is then,
-- without duplicating anything already created (every insert below is
-- guarded by room/week or check/date existence).
--
-- Run this in the Supabase SQL editor after 0035, in order. Safe to run
-- more than once — re-running it just tops up any newly-elapsed weeks.

do $$
declare
  week_start date := date '2025-12-29';
  this_monday date := date_trunc('week', current_date)::date; -- Postgres weeks start Monday
  r record;
  new_check_id uuid;
  d int;
begin
  while week_start <= this_monday loop
    for r in select id as room_id from roster_rooms where id in (select distinct room_id from hazard_checklist_templates)
    loop
      -- Header row for this room/week, if it doesn't already exist.
      insert into hazard_checks (room_id, week_start_date)
      values (r.room_id, week_start)
      on conflict (room_id, week_start_date) do nothing
      returning id into new_check_id;

      if new_check_id is null then
        select id into new_check_id from hazard_checks where room_id = r.room_id and week_start_date = week_start;
      end if;

      -- Snapshot this room's current template as unchecked items, only if
      -- this check has no items yet (keeps this safe to re-run).
      if not exists (select 1 from hazard_check_items where check_id = new_check_id) then
        insert into hazard_check_items (check_id, category, item_text, sort_order)
        select new_check_id, t.category, t.item_text, t.sort_order
        from hazard_checklist_templates t
        where t.room_id = r.room_id;
      end if;

      -- Five blank weekday sign-off rows (Monday..Friday), unsigned.
      for d in 0..4 loop
        insert into hazard_check_daily_signoffs (check_id, check_date)
        values (new_check_id, week_start + d)
        on conflict (check_id, check_date) do nothing;
      end loop;

      new_check_id := null;
    end loop;

    week_start := week_start + 7;
  end loop;
end $$;

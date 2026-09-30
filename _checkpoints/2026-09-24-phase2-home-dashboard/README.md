# Checkpoint — before Phase 2 Home dashboard build (2026-09-24)

This folder holds the exact pre-change contents of the 4 existing files touched by the Phase 2 Home dashboard build (new operational `/dashboard` home screen, relocation of the ERO readiness overview to `/checklist`), taken immediately before any edits.

Same as the Phase 1 checkpoint: no terminal/git access from this session, so this is a straight copy-based revert point rather than a real `git commit`. If you run a real git commit either before reviewing this or right now, that's the better, more complete checkpoint (covers the whole repo):

```
git add -A
git commit -m "Checkpoint before Phase 2 Home dashboard build"
```

## To revert Phase 2 by hand (if git isn't an option)

Copy each file below back over its live counterpart:

- `src/components/icons.tsx` → `beach-kids-ero-portal/src/components/icons.tsx`
- `src/lib/utils.ts` → `beach-kids-ero-portal/src/lib/utils.ts`
- `src/app/(portal)/checklist/page.tsx` → `beach-kids-ero-portal/src/app/(portal)/checklist/page.tsx`
- `src/app/(portal)/dashboard/page.tsx` → `beach-kids-ero-portal/src/app/(portal)/dashboard/page.tsx`

Then delete these Phase 2 additions (safe to delete, nothing else references them yet):

- `src/lib/data/home.ts`
- `src/components/dashboard/quick-create-menu.tsx`
- `src/components/dashboard/home-header.tsx`
- `src/components/dashboard/today-summary.tsx`
- `src/components/dashboard/rooms-today.tsx`
- `src/components/dashboard/upcoming-panel.tsx`
- `src/components/dashboard/recent-activity-panel.tsx`

## What changed and why

- `src/components/icons.tsx` — added `BellIcon` (for the disabled Notifications button) on top of the icons already added in Phase 1.
- `src/lib/utils.ts` — added `formatLongDate()`, used for the "Monday, 24 September 2026"-style date line under the greeting. Nothing existing in the file was changed.
- `src/app/(portal)/checklist/page.tsx` — gained the ERO readiness ring and the 8-tile "at a glance" stats block at the top (moved here from the old `/dashboard`, not deleted). Everything else on the page (search, sections, flagged filter) is untouched.
- `src/app/(portal)/dashboard/page.tsx` — full rewrite: this is now the operational Home screen (greeting, Quick Create, Today at Beach Kids, Rooms today, Needs attention, Upcoming, Recent activity) instead of the old ERO dashboard. `getNeedsAttention` is reused as-is from the existing `lib/data/dashboard.ts`.

No database, auth, route, or other page-content files were touched by this phase, so reverting the 4 files above and deleting the 7 new ones fully undoes it, leaving Phase 1's shell in place.
